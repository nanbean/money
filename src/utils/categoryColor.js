import {
	FOOD_COLOR,
	TRANSPORT_COLOR,
	CULTURAL_LIFE_COLOR,
	EDUCATION_COLOR,
	SHOPPING_COLOR,
	MEDICAL_COLOR,
	HOBBY_COLOR,
	BEAUTY_COLOR,
	UTILITY_COLOR,
	FINANCE_COLOR,
	ETC_COLOR,
	FOOD_COLOR_CATEGORY,
	TRANSPORT_COLOR_CATEGORY,
	CULTURAL_LIFE_COLOR_CATEGORY,
	EDUCATION_COLOR_CATEGORY,
	SHOPPING_COLOR_CATEGORY,
	MEDICAL_COLOR_CATEGORY,
	HOBBY_COLOR_CATEGORY,
	ETC_COLOR_CATEGORY,
	BEAUTY_COLOR_CATEGORY,
	UTILITY_COLOR_CATEGORY,
	FINANCE_COLOR_CATEGORY
} from '../constants';

// Match against base category — handles subcategory paths like "교통비:차량유지비"
const baseOf = (category) => (category || '').split(':')[0];

export function getCategoryColor (category) {
	const c = baseOf(category);
	if (FOOD_COLOR_CATEGORY.find(i => i === c)) {
		return FOOD_COLOR;
	} else if (TRANSPORT_COLOR_CATEGORY.find(i => i === c)) {
		return TRANSPORT_COLOR;
	} else if (CULTURAL_LIFE_COLOR_CATEGORY.find(i => i === c)) {
		return CULTURAL_LIFE_COLOR;
	} else if (EDUCATION_COLOR_CATEGORY.find(i => i === c)) {
		return EDUCATION_COLOR;
	} else if (SHOPPING_COLOR_CATEGORY.find(i => i === c)) {
		return SHOPPING_COLOR;
	} else if (MEDICAL_COLOR_CATEGORY.find(i => i === c)) {
		return MEDICAL_COLOR;
	} else if (HOBBY_COLOR_CATEGORY.find(i => i === c)) {
		return HOBBY_COLOR;
	} else if (BEAUTY_COLOR_CATEGORY.find(i => i === c)) {
		return BEAUTY_COLOR;
	} else if (UTILITY_COLOR_CATEGORY.find(i => i === c)) {
		return UTILITY_COLOR;
	} else if (FINANCE_COLOR_CATEGORY.find(i => i === c)) {
		return FINANCE_COLOR;
	} else if (ETC_COLOR_CATEGORY.find(i => i === c)) {
		return ETC_COLOR;
	}

	return null;
}

// Picker palette — project's 11 category colors first, then the design handoff
// COLOR_PALETTE additions (settings-editors.jsx) that aren't already in the project's set.
// Stored as `state.settings.categoryColors[name]` (hex string) when user picks one.
export const CATEGORY_COLOR_OPTIONS = [
	// — Project default colors —
	FOOD_COLOR,           // #e4815f
	TRANSPORT_COLOR,      // #5e9cd4
	CULTURAL_LIFE_COLOR,  // #d071c8
	EDUCATION_COLOR,      // #a18dcd
	SHOPPING_COLOR,       // #e5a54f
	MEDICAL_COLOR,        // #e55266
	HOBBY_COLOR,          // #65b362
	BEAUTY_COLOR,         // #2a9d8f
	UTILITY_COLOR,        // #708090
	FINANCE_COLOR,        // #4682B4
	ETC_COLOR,            // #e0e0e0
	// — Design handoff additions (deduped vs project set) —
	'#c9609d', '#8773bf', '#d99547', '#b8862e', '#caa040',
	'#e88aa0', '#9f7a3a', '#7a6a55', '#6f8db5', '#7e6f9c',
	'#a8a8a8', '#3d8b6b', '#5aa888', '#10b981', '#f59e0b',
	'#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
	'#f97316'
];

const FALLBACK_COLOR = '#9ca3af';

// Resolve color for a category: prefer user-picked override, then default project
// mapping (`getCategoryColor`), then a neutral fallback. Always returns a hex string.
export function resolveCategoryColor (name, pickedColor) {
	if (pickedColor) return pickedColor;
	return getCategoryColor(name) || FALLBACK_COLOR;
}