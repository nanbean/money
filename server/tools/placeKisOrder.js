// KIS order placement (KR + US) — gated three ways:
//   1. dry-run by default; --apply must be explicit
//   2. with --apply, an interactive y/N confirm is still required
//   3. every attempted apply is appended to historiesDB (audit log)
//
// Usage examples:
//   # KR limit buy (dry-run)
//   node server/tools/placeKisOrder.js --market=kr --side=buy --symbol=005930 --qty=1 --price=70000
//   # US limit sell (apply)
//   node server/tools/placeKisOrder.js --market=us --side=sell --symbol=F --exchange=NYSE --qty=1 --price=11.20 --apply
//
// Env: NODE_ENV=production loads .env.production credentials. KIS_TRADE_LIVE
// in env defaults the endpoint; --live / --vts override per call.
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');
const { v1: uuidv1 } = require('uuid');

const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production';
dotenv.config({ path: path.resolve(__dirname, '..', '..', envFile) });

const args = process.argv.slice(2);
const argMap = {};
for (const a of args) {
	if (a.startsWith('--')) {
		const eq = a.indexOf('=');
		if (eq === -1) argMap[a.slice(2)] = true;
		else argMap[a.slice(2, eq)] = a.slice(eq + 1);
	}
}

const market = String(argMap.market || '').toLowerCase();
const side = String(argMap.side || '').toLowerCase();
const symbol = argMap.symbol;
const qty = Number(argMap.qty);
const price = Number(argMap.price);
const exchange = String(argMap.exchange || 'NASD').toUpperCase();
const ordType = String(argMap.type || '00');
const apply = !!argMap.apply;
const liveOverride = argMap.live ? true : (argMap.vts ? false : undefined);
const account = argMap.account || 'main';

const validate = () => {
	if (!['kr', 'us'].includes(market)) throw new Error('--market must be kr or us');
	if (!['buy', 'sell'].includes(side)) throw new Error('--side must be buy or sell');
	if (!symbol) throw new Error('--symbol required');
	if (!Number.isFinite(qty) || qty <= 0) throw new Error('--qty must be > 0');
	if (!Number.isFinite(price) || price <= 0) throw new Error('--price must be > 0');
	if (market === 'us' && !['NASD', 'NYSE', 'AMEX'].includes(exchange)) {
		throw new Error('--exchange must be NASD/NYSE/AMEX');
	}
};

const kis = require('../services/kisConnector');
const historyDB = require('../db/historyDB');

const fmt = (n, cur) => {
	const num = Number(n);
	if (cur === 'USD') return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	return '₩' + Math.round(num).toLocaleString();
};

const auditAttempt = async (entry) => {
	const id = `order:KIS:${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}-${uuidv1().slice(0, 8)}`;
	try {
		await historyDB.putDoc({ _id: id, type: 'kis-order', ...entry, ts: new Date().toISOString() });
	} catch (err) {
		console.error('  ⚠ audit log write failed:', err.message);
	}
};

const askYN = (question) => new Promise((resolve) => {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	rl.question(question, (a) => {
		rl.close();
		resolve(String(a).trim().toLowerCase() === 'y' || String(a).trim().toLowerCase() === 'yes');
	});
});

(async () => {
	try {
		validate();
		const ctx = kis.tradeContext(liveOverride, account);
		const cur = market === 'kr' ? 'KRW' : 'USD';

		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(`  KIS order plan · ${ctx.live ? 'LIVE 실전' : 'VTS 모의'} · alias=${ctx.alias} ${apply ? '· APPLY' : '· DRY-RUN'}`);
		console.log(`  Account ${ctx.cano || '?'}-${ctx.prdt || '?'}`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(`  market   : ${market.toUpperCase()}${market === 'us' ? ` (${exchange})` : ''}`);
		console.log(`  side     : ${side.toUpperCase()}`);
		console.log(`  symbol   : ${symbol}`);
		console.log(`  qty      : ${qty}`);
		console.log(`  price    : ${fmt(price, cur)} (${ordType === '01' ? '시장가' : '지정가'})`);
		console.log(`  total    : ${fmt(qty * price, cur)}`);

		// Cross-check current balance / cash
		try {
			if (market === 'kr') {
				const kr = await kis.getKisDomesticBalance({ live: liveOverride, account });
				const cash = Number(kr.summary?.dnca_tot_amt || 0);
				const held = (kr.holdings || []).find(h => h.pdno === symbol);
				const heldQty = held ? Number(held.hldg_qty) : 0;
				console.log('');
				console.log(`  cash     : ${fmt(cash, 'KRW')}`);
				console.log(`  held qty : ${heldQty} ${symbol}`);
				if (side === 'buy' && cash < qty * price) {
					console.log(`  ⚠ 예수금 부족 (예상 -${fmt(qty * price - cash, 'KRW')})`);
				}
				if (side === 'sell' && heldQty < qty) {
					console.log(`  ⚠ 보유수량 부족 (보유 ${heldQty} < 매도 ${qty})`);
				}
			} else {
				const us = await kis.getKisOverseasBalance({ live: liveOverride, account });
				const held = (us.holdings || []).find(h => (h.ovrs_pdno || h.pdno) === symbol);
				const heldQty = held ? Number(held.ovrs_cblc_qty) : 0;
				const pb = await kis.getKisOverseasPresentBalance({ live: liveOverride, account });
				const usdRow = (pb.output2 || []).find(c => c.crcy_cd === 'USD');
				const cash = Number(usdRow?.frcr_dncl_amt_2 || usdRow?.frcr_dncl_amt || 0);
				console.log('');
				console.log(`  cash USD : ${fmt(cash, 'USD')}`);
				console.log(`  held qty : ${heldQty} ${symbol}`);
				if (side === 'buy' && cash < qty * price) {
					console.log(`  ⚠ USD 예수금 부족 (예상 -${fmt(qty * price - cash, 'USD')})`);
				}
				if (side === 'sell' && heldQty < qty) {
					console.log(`  ⚠ 보유수량 부족 (보유 ${heldQty} < 매도 ${qty})`);
				}
			}
		} catch (err) {
			console.log(`  ⚠ balance preflight failed: ${err.message}`);
		}

		console.log('');
		if (!apply) {
			console.log('Dry-run only. Re-run with --apply to send the order.');
			return;
		}

		const ok = await askYN('  Send this order to KIS? (y/N): ');
		if (!ok) {
			console.log('  Aborted.');
			return;
		}

		const attemptEntry = {
			market, side, symbol, qty, price, exchange: market === 'us' ? exchange : null,
			ordType, live: ctx.live, account: `${ctx.cano}-${ctx.prdt}`, status: 'attempt'
		};
		await auditAttempt(attemptEntry);

		try {
			const result = market === 'kr'
				? await kis.placeKisDomesticOrder({ live: liveOverride, side, symbol, quantity: qty, price, ordType })
				: await kis.placeKisOverseasOrder({ live: liveOverride, side, symbol, exchange, quantity: qty, price, ordType });

			console.log('  ✓ Order accepted by KIS:');
			const out = result.output || result;
			console.log(`    KRX_FWDG_ORD_ORGNO : ${out.KRX_FWDG_ORD_ORGNO || ''}`);
			console.log(`    ODNO               : ${out.ODNO || ''}`);
			console.log(`    ORD_TMD            : ${out.ORD_TMD || ''}`);
			console.log(`    msg                : ${result.msg1 || ''}`);

			await auditAttempt({ ...attemptEntry, status: 'accepted', kisResult: result });
		} catch (err) {
			console.log(`  ✗ Order rejected: ${err.message}`);
			await auditAttempt({ ...attemptEntry, status: 'rejected', error: err.message });
			process.exit(2);
		}
	} catch (err) {
		console.error('placeKisOrder failed:', err.message);
		process.exit(1);
	}
})();
