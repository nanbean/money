import {
	FOOD_COLOR,
	TRANSPORT_COLOR,
	CULTURAL_LIFE_COLOR,
	EDUCATION_COLOR,
	SHOPPING_COLOR,
	MEDICAL_COLOR,
	HOBBY_COLOR,
	ETC_COLOR,
	NO_COLOR,
	FOOD_COLOR_CATEGORY,
	TRANSPORT_COLOR_CATEGORY,
	CULTURAL_LIFE_COLOR_CATEGORY,
	EDUCATION_COLOR_CATEGORY,
	SHOPPING_COLOR_CATEGORY,
	MEDICAL_COLOR_CATEGORY,
	HOBBY_COLOR_CATEGORY,
	ETC_COLOR_CATEGORY
} from '../constants';

export function getCategoryColor (category) {
	if (FOOD_COLOR_CATEGORY.find(i => i === category)) {
		return FOOD_COLOR;
	} else if (TRANSPORT_COLOR_CATEGORY.find(i => i === category)) {
		return TRANSPORT_COLOR;
	} else if (CULTURAL_LIFE_COLOR_CATEGORY.find(i => i === category)) {
		return CULTURAL_LIFE_COLOR;
	} else if (EDUCATION_COLOR_CATEGORY.find(i => i === category)) {
		return EDUCATION_COLOR;
	} else if (SHOPPING_COLOR_CATEGORY.find(i => i === category)) {
		return SHOPPING_COLOR;
	} else if (MEDICAL_COLOR_CATEGORY.find(i => i === category)) {
		return MEDICAL_COLOR;
	} else if (HOBBY_COLOR_CATEGORY.find(i => i === category)) {
		return HOBBY_COLOR;
	} else if (ETC_COLOR_CATEGORY.find(i => i === category)) {
		return ETC_COLOR;
	}
  
	return NO_COLOR;
}