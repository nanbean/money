/*
 * qif-nodejs
 * https://github.com/leotulipan/qif-nodejs
 *
 * Copyright (c) 2012 leotulipan
 * Licensed under the MIT license.
 */
module.exports = (function () {

	'use strict';

	var fs = require('fs');

	function writeField(code, value) {
		var result = '';
		if (value) {
			result += code;
			result += value
			result += '\r\n';
		}
		return result;
	}

	function writeCurrencyField(code, value) {
		var result = '';
		if (typeof value !== 'undefined') {
			result += code;
			if (value && value.toString().match(/\./)) {
				result += parseFloat(value);
			} else {
				if (value === 0) {
					result += value;
				} else {
					result += (value ? parseInt(value, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '');
				}
			}
			result += '\r\n';
		}
		return result;
	}

	function writeDivisionField(division) {
		var result = '';
		if (division) {
			for (var i = 0; i < division.length; i++) {
				var transaction = division[i];
				if (transaction.subcategory) {
					result += writeField('S', `${transaction.category}:${transaction.subcategory}`);
				} else {
					result += writeField('S', transaction.category);
				}
				result += writeField('E', transaction.description);
				result += writeCurrencyField('$', transaction.amount);
			};
		}
		return result;
	}

	var write = function (qifData) {
		var result;
		if (qifData && qifData.type) {
			result = `!Type:${qifData.type}\r\n`;

			if (qifData.type === 'Invst') {
				if (qifData.transactions) {
					const transactions = qifData.transactions;
					for (var i = 0; i < transactions.length; i++) {
						var transaction = transactions[i];
						result += writeField('D', transaction.date);
						result += writeField('M', transaction.memo);
						result += writeCurrencyField('T', transaction.amount);
						result += writeField('N', transaction.activity);
						result += writeField('Y', transaction.investment);
						result += writeCurrencyField('I', transaction.price);
						result += writeCurrencyField('Q', transaction.quantity);
						result += writeCurrencyField('O', transaction.commission);
						result += writeField('C', transaction.clearedStatus);
						result += writeField('P', transaction.payee);
						if (transaction.subcategory) {
							result += writeField('L', `${transaction.category}:${transaction.subcategory}`);
						} else {
							result += writeField('L', transaction.category);
						}

						result += writeDivisionField(transaction.division);
						result += writeField('E', transaction.description);
						result += writeField('A', transaction.address);
						result += '^\r\n';
					};
				}
			} else {
				if (qifData.transactions) {
					const transactions = qifData.transactions;
					for (var i = 0; i < transactions.length; i++) {
						var transaction = transactions[i];
						result += writeField('D', transaction.date);
						result += writeField('M', transaction.memo);
						result += writeCurrencyField('T', transaction.amount);
						result += writeField('C', transaction.clearedStatus);
						result += writeField('P', transaction.payee);
						if (transaction.subcategory) {
							result += writeField('L', `${transaction.category}:${transaction.subcategory}`);
						} else {
							result += writeField('L', transaction.category);
						}

						result += writeDivisionField(transaction.division);

						result += writeField('E', transaction.description);
						result += writeField('N', transaction.number);
						result += writeField('A', transaction.address);
						result += '^\r\n';
					};
				}
			}

		}

		return result;
	};

	var writeToFile = function (qifData, file) {
		return new Promise(function (resolve, reject) {
			var data = write(qifData);
			fs.writeFile(file, data, function (err) {
				if (err) throw err;

				console.log('file updated')
				resolve('done');
			});
		});
	};

	return {
		write: write,
		writeToFile: writeToFile
	};

})();
