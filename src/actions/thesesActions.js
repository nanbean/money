import { SET_THESES } from './actionTypes';

const fetchJson = async (url, options = {}) => {
	const res = await fetch(url, { credentials: 'same-origin', ...options });
	if (!res.ok) {
		throw new Error(`${url} failed: HTTP ${res.status}`);
	}
	return await res.json();
};

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const getThesesAction = () => {
	return async (dispatch) => {
		try {
			const data = await fetchJson('/api/theses');
			dispatch({
				type: SET_THESES,
				payload: Array.isArray(data?.theses) ? data.theses : []
			});
		} catch (err) {
			console.log('getThesesAction error:', err); // eslint-disable-line no-console
		}
	};
};

// Generic upsert — caller hands us the full doc shape; server re-syncs _rev.
export const upsertThesisAction = (thesis) => {
	return async (dispatch) => {
		const saved = await fetchJson('/api/theses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(thesis)
		});
		await dispatch(getThesesAction());
		return saved;
	};
};

// Append a single review (ad-hoc id, today's date by default). Bumps the
// thesis's updatedAt so the "days since last review" indicator stays fresh.
export const addReviewAction = (thesisId, review) => {
	return async (dispatch, getState) => {
		const theses = (getState().theses || []);
		const target = theses.find(t => t._id === thesisId);
		if (!target) throw new Error('thesis not found');
		const next = {
			...target,
			reviews: [
				...(target.reviews || []),
				{
					id: newId('rv'),
					date: review.date || new Date().toISOString().slice(0, 10),
					pillarId: review.pillarId,
					score: review.score,
					note: review.note || '',
					sources: Array.isArray(review.sources) ? review.sources.filter(Boolean) : []
				}
			]
		};
		return await dispatch(upsertThesisAction(next));
	};
};

export const deleteReviewAction = (thesisId, reviewId) => {
	return async (dispatch, getState) => {
		const theses = (getState().theses || []);
		const target = theses.find(t => t._id === thesisId);
		if (!target) throw new Error('thesis not found');
		const next = {
			...target,
			reviews: (target.reviews || []).filter(r => r.id !== reviewId)
		};
		return await dispatch(upsertThesisAction(next));
	};
};
