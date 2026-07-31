// Retry an async function with exponential backoff + jitter on transient errors.
// Gemini/Google API frequently returns 503 ("high demand") and upstream fetch
// hiccups return "fetch failed"; these are self-healing, so a few backed-off
// retries turn most of them into eventual successes instead of dropped work.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Transient/retryable: rate limit, upstream 5xx, and low-level fetch failures.
// 4xx (except 429) are treated as permanent — retrying won't help.
const isRetryableError = (error) => {
	const status = error && error.status;
	if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
		return true;
	}
	const msg = ((error && error.message) || '').toLowerCase();
	return msg.includes('fetch failed')
		|| msg.includes('service unavailable')
		|| msg.includes('overloaded')
		|| msg.includes('high demand')
		|| msg.includes('etimedout')
		|| msg.includes('econnreset');
};

const retryWithBackoff = async (fn, options = {}) => {
	const {
		retries = 3,
		baseDelay = 1000,
		maxDelay = 8000,
		label = 'operation'
	} = options;

	let lastError;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt === retries || !isRetryableError(error)) {
				throw error;
			}
			const backoff = Math.min(baseDelay * 2 ** attempt, maxDelay);
			const jitter = Math.round(backoff * 0.25 * Math.random());
			const delay = backoff + jitter;
			console.warn(`[retry] ${label}: transient error (${error.status || error.message}), retry ${attempt + 1}/${retries} in ${delay}ms`);
			await sleep(delay);
		}
	}
	throw lastError;
};

module.exports = { retryWithBackoff, isRetryableError };
