import moment from 'moment';
import _ from 'lodash';

export const FOOD_COLOR = '#e4815f';
export const TRANSPORT_COLOR = '#5e9cd4';
export const CULTURAL_LIFE_COLOR = '#d071c8';
export const EDUCATION_COLOR = '#a18dcd';
export const SHOPPING_COLOR = '#e5a54f';
export const MEDICAL_COLOR = '#e55266';
export const HOBBY_COLOR = '#65b362';
export const ETC_COLOR = '#c0c0c0';
export const NO_COLOR = '#000000';

export const ARCHITECTURE_CATEGORY = '건축';
export const EVENT_CATEGORY = '경조사-선물';
export const BILL_CATEGORY = '공과금';
export const EDUCATION_CATEGORY = '교육';
export const TRANSPORT_CATEGORY = '교통비';
export const ETC_EXPENSE_CATEGORY = '기타 지출';
export const LOAN_INTEREST_CATEGORY = '대출이자';
export const BEAUTY_CATEGORY = '미용';
export const INSURANCE_CATEGORY = '보험';
export const HOUSEHOLD_GOODS_CATEGORY = '생활용품비';
export const TAX_CATEGORY = '세금';
export const COMISSION_CATEGORY = '수수료';
export const FOOD_CATEGORY = '식비';
export const NON_EXPENSE_CATEGORY = '실제지출아님';
export const CHILD_CARE_CATEGORY = '육아';
export const MEDICAL_CATEGORY = '의료비';
export const CLOTH_CATEGORY = '의류';
export const LEISURE_CATEGORY = '취미';
export const COMMUNICATION_CATEGORY = '통신비';
export const FEE_CATEGORY = '회비';

export const FOOD_COLOR_CATEGORY = ['식비'];
export const TRANSPORT_COLOR_CATEGORY = ['교통비'];
export const CULTURAL_LIFE_COLOR_CATEGORY = ['문화생활', '경조사-선물'];
export const EDUCATION_COLOR_CATEGORY = ['교육', '육아'];
export const SHOPPING_COLOR_CATEGORY = ['생활용품비', '의류', '대출이자', '공과금', '미용', '보험', '수수료', '통신비', '회비'];
export const MEDICAL_COLOR_CATEGORY = ['의료비'];
export const HOBBY_COLOR_CATEGORY = ['취미-레저'];
export const ETC_COLOR_CATEGORY = ['기타 지출', '실제지출아님'];

export const START_YEAR = 2005;
export const END_YEAR = parseInt(moment().format('YYYY'), 10);
export const YEAR_LIST = Array.from({ length: END_YEAR - START_YEAR + 1 }, (v, k) => k + START_YEAR).map(i => ({ key: i, value: i, text: i }));
export const MONTH_LIST = Array.from({ length: 12 }, (v, k) => _.padStart(k + 1, 2, '0'));

export const TYPE_EMOJI = {
	'Bank': '🏦',
	'CCard': '💳',
	'Cash': '💵',
	'Invst': '📈',
	'Oth L': '🏧',
	'Oth A': '🏠'
};

export const BANK_TYPE = [
	'Bank',
	'CCard',
	'Cash',
	'Oth%20A',
	'Oth%20L'
];

export const INVEST_TYPE = [
	'Invst'
];