import moment from 'moment';

export function toCurrencyFormat (number, currency = 'KRW') {
	if (number) {
		if (number % 1 !== 0) {
			return parseFloat(number).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		} else {
			return parseInt(number, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');			
		}
	} else {
		return 0;
	}
}

export function toDateFormat (date) {
	return moment(date).format('YYYY-MM-DD');
}

export function toPriceFormat (number) {
	if (Number.isInteger(number)) {
		return number ? parseInt(number, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 0;
	} else {
		return number.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}
}

export function toPercentFormat (number) {
	return `${(number * 100).toFixed(2)}%`;
}

export function toCurrencyFormatWithSymbol (number, currency = 'KRW') {
	return number && number.toLocaleString(currency === 'USD' ? 'en-US':'ko-KR', { style: 'currency', currency: currency });
};