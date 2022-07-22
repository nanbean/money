const couchdb = require('../couchdb');
const lifetimePlanner = require('./lifetimePlanner');

test('the fetch fails with an error', async () => {
  try {
		const accounts = await couchdb.getAccounts();
		console.log(accounts);
    const data = await lifetimePlanner.getLifetimeFlowList(accounts);
  } catch (e) {
    expect(e).toMatch('error');
  }
}, 30000);