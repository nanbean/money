// Read-only: today's KIS orders (KR + US), filled and outstanding. Useful
// after placeKisOrder.js --apply to see what KIS recorded, and as an audit
// cross-reference against the historiesDB log.
//
// Usage:
//   node server/tools/inquireKisOrders.js                   # today
//   node server/tools/inquireKisOrders.js --from=2026-05-01 --to=2026-05-03
//   --live / --vts override KIS_TRADE_LIVE
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
const from = argMap.from;
const to = argMap.to;

const kis = require('../services/kisConnector');

const dump = (rows, fields) => {
	if (!rows || rows.length === 0) {
		console.log('  (none)');
		return;
	}
	for (const r of rows) {
		console.log('  ' + fields.map(f => `${f}=${r[f] ?? ''}`).join('  '));
	}
};

(async () => {
	try {
		const ctx = kis.tradeContext(liveOverride, account);
		console.log(`KIS orders · ${ctx.live ? 'LIVE' : 'VTS'} · alias=${ctx.alias} · ${ctx.cano}-${ctx.prdt} · ${from || 'today'} → ${to || 'today'}`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

		console.log('\n[KR domestic]');
		try {
			const kr = await kis.getKisDomesticOrderHistory({ live: liveOverride, from, to, account });
			dump(kr.output1 || [], ['ord_dt', 'odno', 'pdno', 'prdt_name', 'sll_buy_dvsn_cd_name', 'ord_qty', 'tot_ccld_qty', 'avg_prvs', 'ord_unpr', 'cncl_yn']);
		} catch (err) {
			console.log(`  err: ${err.message}`);
		}

		console.log('\n[US overseas]');
		try {
			const us = await kis.getKisOverseasOrderHistory({ live: liveOverride, from, to, account });
			dump(us.output || [], ['ord_dt', 'odno', 'pdno', 'ovrs_excg_cd', 'sll_buy_dvsn_cd_name', 'ft_ord_qty', 'ft_ccld_qty', 'ft_ord_unpr3', 'rjct_rson_name']);
		} catch (err) {
			console.log(`  err: ${err.message}`);
		}

		console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	} catch (err) {
		console.error('inquireKisOrders failed:', err);
		process.exit(1);
	}
})();
