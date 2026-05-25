// Dedupe concurrent invocations of an async function. While a call is in-flight,
// subsequent calls return the same pending promise instead of starting a new run.
// Use to protect tasks that mutate shared external state (Google Sheets singleton,
// CouchDB documents with fixed _id) from racing with themselves.
const singleFlight = (label, fn) => {
	let inFlight = null;
	return (...args) => {
		if (inFlight) {
			console.log(`[singleFlight] ${label} dedup: returning in-flight promise`);
			return inFlight;
		}
		inFlight = Promise.resolve()
			.then(() => fn(...args))
			.finally(() => { inFlight = null; });
		return inFlight;
	};
};

module.exports = { singleFlight };
