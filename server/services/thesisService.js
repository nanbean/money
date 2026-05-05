// Investment thesis tracking — multi-ticker, manual review-driven.
//
// Doc shape (CouchDB `theses_nanbean`):
//   {
//     _id: 'thesis:TSLA',
//     _rev,
//     ticker, title,
//     pillars: [{ id, label, description }, ...],
//     reviewIntervalDays: 90,
//     reviews: [{ id, date, pillarId, score, note, sources: [url] }, ...],
//     createdAt, updatedAt
//   }
//
// Score enum: 'strengthening' | 'on-track' | 'weakening' | 'broken'
const { nano, thesesDB } = require('../db');

const DB_NAME = 'theses_nanbean';

let _ensured = null;
const ensure = async () => {
	if (_ensured) return _ensured;
	_ensured = (async () => {
		try {
			await nano.db.get(DB_NAME);
		} catch (err) {
			if (err.statusCode === 404) {
				await nano.db.create(DB_NAME);
			} else {
				throw err;
			}
		}
	})();
	try {
		await _ensured;
	} catch (err) {
		_ensured = null;
		throw err;
	}
	return _ensured;
};

const list = async () => {
	await ensure();
	const res = await thesesDB.list({ include_docs: true });
	return res.rows
		.map(r => r.doc)
		.filter(d => d && !d._id.startsWith('_design'));
};

const get = async (id) => {
	await ensure();
	return await thesesDB.get(id);
};

const upsert = async (doc) => {
	await ensure();
	if (!doc || !doc._id) {
		throw new Error('thesis upsert requires _id');
	}
	const now = new Date().toISOString();
	const next = { ...doc, updatedAt: now };
	if (!next.createdAt) next.createdAt = now;
	if (!next._rev) {
		try {
			const existing = await thesesDB.get(doc._id);
			next._rev = existing._rev;
		} catch (err) {
			if (err.statusCode !== 404) throw err;
		}
	}
	const result = await thesesDB.insert(next);
	return { ...next, _id: result.id, _rev: result.rev };
};

const remove = async (id) => {
	await ensure();
	const existing = await thesesDB.get(id);
	return await thesesDB.destroy(id, existing._rev);
};

module.exports = { list, get, upsert, remove };
