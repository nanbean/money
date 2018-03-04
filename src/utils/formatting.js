import moment from 'moment';

export function toCurrencyFormat (number) {
	if (number) {
		return parseInt(number, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
