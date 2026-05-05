// Read-only KIS broker balance inquiry. Pulls KR + US holdings and FX cash,
// prints a tidy snapshot for cross-checking against PouchDB-tracked holdings.
//
// Usage:
//   node server/tools/inquireKisBalance.js               # follows KIS_TRADE_LIVE env
//   node server/tools/inquireKisBalance.js --live        # force LIVE this call
//   node server/tools/inquireKisBalance.js --vts         # force VTS this call
//   NODE_ENV=production node server/tools/inquireKisBalance.js --live
const path = require('path');
const dotenv = require('dotenv');

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
const liveOverride = argMap.live ? true : (argMap.vts ? false : undefined);
const account = argMap.account || 'main';

const kis = require('../services/kisConnector');

const num = (v) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};
const fmtKRW = (v) => '₩' + Math.round(num(v)).toLocaleString();
const fmtUSD = (v) => '$' + num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sign = (n) => (n >= 0 ? '+' : '');
const pad = (s, w, right = false) => right ? String(s).padStart(w) : String(s).padEnd(w);

(async () => {
	try {
		const ctx = kis.tradeContext(liveOverride, account);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(`  KIS balance · ${ctx.live ? 'LIVE 실전' : 'VTS 모의'} · alias=${ctx.alias}`);
		console.log(`  Account ${ctx.cano || '?'}-${ctx.prdt || '?'}  ·  ${ctx.baseUrl}`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

		// ── Korea ──
		console.log('\n[Korea / 한국 주식]');
		try {
			const kr = await kis.getKisDomesticBalance({ live: liveOverride, account });
			const holdings = (kr.holdings || []).filter(h => num(h.hldg_qty) > 0);
			if (holdings.length === 0) {
				console.log('  (보유 종목 없음)');
			} else {
				console.log(`  ${pad('종목', 26)}${pad('수량', 8, true)}${pad('평가', 16, true)}${pad('손익', 16, true)}${pad('수익률', 10, true)}`);
				for (const h of holdings) {
					const name = h.prdt_name || h.pdno;
					console.log(`  ${pad(name, 26)}${pad(num(h.hldg_qty).toLocaleString(), 8, true)}${pad(fmtKRW(h.evlu_amt), 16, true)}${pad(sign(num(h.evlu_pfls_amt)) + fmtKRW(Math.abs(num(h.evlu_pfls_amt))), 16, true)}${pad(`${sign(num(h.evlu_pfls_rt))}${num(h.evlu_pfls_rt).toFixed(2)}%`, 10, true)}`);
				}
			}
			if (kr.summary) {
				const s = kr.summary;
				console.log('');
				console.log(`  주식 평가합   : ${fmtKRW(s.scts_evlu_amt)}`);
				console.log(`  예수금        : ${fmtKRW(s.dnca_tot_amt)}`);
				console.log(`  총평가        : ${fmtKRW(s.tot_evlu_amt)}`);
				console.log(`  총손익        : ${sign(num(s.evlu_pfls_smtl_amt))}${fmtKRW(Math.abs(num(s.evlu_pfls_smtl_amt)))}  (자산총액 ${fmtKRW(s.nass_amt)})`);
			}
		} catch (err) {
			console.log(`  err: ${err.message}`);
		}

		// ── US ──
		console.log('\n[US / 미국 주식]');
		try {
			const us = await kis.getKisOverseasBalance({ live: liveOverride, account });
			const holdings = (us.holdings || []).filter(h => num(h.ovrs_cblc_qty) > 0);
			if (holdings.length === 0) {
				console.log('  (보유 종목 없음)');
			} else {
				console.log(`  ${pad('종목', 26)}${pad('수량', 10, true)}${pad('평가', 16, true)}${pad('손익', 16, true)}${pad('수익률', 10, true)}`);
				for (const h of holdings) {
					const name = h.ovrs_item_name || h.ovrs_pdno;
					const pfls = num(h.frcr_evlu_pfls_amt);
					const ret = num(h.evlu_pfls_rt);
					console.log(`  ${pad(name, 26)}${pad(num(h.ovrs_cblc_qty).toLocaleString(), 10, true)}${pad(fmtUSD(h.ovrs_stck_evlu_amt), 16, true)}${pad(sign(pfls) + fmtUSD(Math.abs(pfls)), 16, true)}${pad(`${sign(ret)}${ret.toFixed(2)}%`, 10, true)}`);
				}
			}
			// per-exchange errors
			for (const r of us.perExchange) {
				if (r.error) console.log(`  ⚠ ${r.exchange}: ${r.error}`);
			}
		} catch (err) {
			console.log(`  err: ${err.message}`);
		}

		// ── FX cash + total assets ──
		console.log('\n[FX 예수금 / 총자산]');
		try {
			const pb = await kis.getKisOverseasPresentBalance({ live: liveOverride, account });
			// output1: per-position rows (already covered); output2: per-currency cash;
			// output3: aggregates. Surface what we can identify.
			const output2 = Array.isArray(pb.output2) ? pb.output2 : [];
			if (output2.length > 0) {
				for (const c of output2) {
					const cur = c.crcy_cd || '?';
					const cash = num(c.frcr_dncl_amt_2 || c.frcr_dncl_amt || 0);
					const buy = num(c.frcr_buy_amt_smtl || 0);
					console.log(`  ${cur} 예수금: ${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}  매수합계: ${buy.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
				}
			}
			const output3 = pb.output3 || (Array.isArray(pb.output) ? pb.output[0] : null);
			if (output3) {
				console.log('');
				if (output3.tot_asst_amt) console.log(`  총자산(원화환산) : ${fmtKRW(output3.tot_asst_amt)}`);
				if (output3.tot_pftrt) console.log(`  총수익률         : ${num(output3.tot_pftrt).toFixed(2)}%`);
				if (output3.evlu_pfls_amt_smtl) console.log(`  총평가손익       : ${fmtKRW(output3.evlu_pfls_amt_smtl)}`);
			}
		} catch (err) {
			console.log(`  err: ${err.message}`);
		}

		console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		process.exit(0);
	} catch (err) {
		console.error('inquireKisBalance failed:', err);
		process.exit(1);
	}
})();
