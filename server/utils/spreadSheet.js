const config = require('../config');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');

// Initialize the sheet - doc ID is the long id in the sheets URL
const doc = new GoogleSpreadsheet(config.googleSpreadsheetDocId);

exports.getLifetimeFlowList = async (accounts) => {
	let netWorth = [];
	const data = [];
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	const colIndex = [
		...alphabet.slice(1, alphabet.length),
		...alphabet.map((i, index) => 'A' + alphabet[index])
	];
	const endYear = 2072;
	const yearList = [];

	await doc.useServiceAccountAuth({
		client_email: config.key.client_email,
		private_key: config.key.private_key
	});

	await doc.loadInfo(); // loads document properties and worksheets

	const maxRow = 90;
	const firstSheet = doc.sheetsByIndex[0];
	await firstSheet.loadCells([`A1:A${maxRow}`, `B1:B${maxRow}`]);

	const currentYear = firstSheet.getCellByA1('B1').value;
	const yearTotalLength = endYear - currentYear + 1; // 2072 - first year
	while (colIndex.length > yearTotalLength) {
		colIndex.pop();
	}
	for (let year = currentYear; year <= endYear; year++ ) {
		yearList.push(year);
	}

	const aColumn = [];
	const bColumn = [];
	for (let row = 1; row <= maxRow; row++) {
		aColumn.push(firstSheet.getCellByA1(`A${row}`).value);
		bColumn.push(firstSheet.getCellByA1(`B${row}`).value);
	}
	const expenseStartIndex = aColumn.findIndex(i => i === '지출') + 2;
	const expenseEndIndex = aColumn.findIndex(i => i === '자산');
	const netAssetIndex = expenseEndIndex + 1;
	const netAssetInflationIndex = netAssetIndex + 1;
	const withdrawStartIndex = aColumn.findIndex(i => i === '연금인출') + 1;
	const withdrawEndIndex = aColumn.findIndex(i => i === '수입');
	const reminderIndex = aColumn.findIndex(i => i === '수입-지출') + 1;
	const savingStartIndex = netAssetInflationIndex + 1;
	const savingEndIndex = reminderIndex - 1;
	const stockReturnCell = `$A${bColumn.findIndex(i => i === '주식수익률') + 1}`;
	// const generalReturnCell = `$A${bColumn.findIndex(i => i === '일반수익률') + 1}`;
	const irpReturnCell = `$A${bColumn.findIndex(i => i === 'IRP수익률') + 1}`;
	const irpSavingIndex = aColumn.findIndex(i => i === 'IRP저축') + 1;
	const irpExpenseIndex = aColumn.findIndex(i => i === 'IRP 연금') + 1;
	const pensionSavingReturnCell = `$A${bColumn.findIndex(i => i === '연금저축수익률') + 1}`;
	const pensionSavingSavingIndex = aColumn.findIndex(i => i === '연금저축저축') + 1;
	const pensionSavingExpenseIndex = aColumn.findIndex(i => i === '연금저축연금') + 1;
	const irpOEMReturnCell = `$A${bColumn.findIndex(i => i === 'IRP오은미수익률') + 1}`;
	const irpOEMSavingIndex = aColumn.findIndex(i => i === 'IRP오은미저축') + 1;
	const irpOEMExpenseIndex = aColumn.findIndex(i => i === 'IRP 오은미 연금') + 1;
	const oemPensionSavingReturnCell = `$A${bColumn.findIndex(i => i === '오은미연금저축수익률') + 1}`;
	const oemPensionSavingIndex = aColumn.findIndex(i => i === '오은미연금저축저축') + 1;
	const oemPensionSavingExpenseIndex = aColumn.findIndex(i => i === '오은미 연금저축 연금') + 1;
	const houseSavingReturnCell = `$A${bColumn.findIndex(i => i === '장마수익률') + 1}`;
	const houseSavingIndex = aColumn.findIndex(i => i === '장마저축') + 1;

	// reduced range because of memory
	await firstSheet.loadCells([
		`B${expenseStartIndex}:${colIndex[colIndex.length - 1]}${expenseEndIndex}`,
		`B${netAssetIndex}:${colIndex[colIndex.length - 1]}${netAssetInflationIndex}`,
		`B${withdrawStartIndex}:${colIndex[colIndex.length - 1]}${withdrawEndIndex}`,
		`B${savingStartIndex}:${colIndex[colIndex.length - 1]}${savingEndIndex}`,
		`B${reminderIndex}:${colIndex[colIndex.length - 1]}${reminderIndex}`
	]);
	console.log('cells loaded');

	for (let rowNumber = expenseStartIndex; rowNumber <= expenseEndIndex; rowNumber++) {
		if (firstSheet.getCellByA1(`A${rowNumber}`).value === '키움증권') {
			const accountItem = accounts.find(i => i.name === '키움증권' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = stockReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const remainderCell = `${colIndex[j - 1]}${reminderIndex}`;
				const remainder = firstSheet.getCellByA1(remainderCell).value || 0;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + remainder * (isSecondYear ? monthGap / 12 : 1);
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = result;
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${remainderCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '키움증권맥쿼리') {

		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '교보변액연금보험') {

		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '동양종금장마') {
			const accountItem = accounts.find(i => i.name === '동양종금장마' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = houseSavingReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}${houseSavingIndex}`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1);
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = result;
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '몬쁭스SK증권') {
			const accountItem = accounts.find(i => i.name === '몬쁭스SK증권' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = stockReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1);
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = result;
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === 'IRP') {
			const accountItem = accounts.find(i => i.name === 'IRP' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = irpReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}${irpSavingIndex}`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}${irpExpenseIndex}`;
				const expense = firstSheet.getCellByA1(expenseCell.replace('$', '')).value || 0;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '연금저축') {
			const accountItem = accounts.find(i => i.name === '연금저축' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = pensionSavingReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}${pensionSavingSavingIndex}`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}${pensionSavingExpenseIndex}`;
				const expense = firstSheet.getCellByA1(expenseCell.replace('$', '')).value || 0;;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === 'IRP오은미') {
			const accountItem = accounts.find(i => i.name === 'IRP오은미' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = irpOEMReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}${irpOEMSavingIndex}`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}${irpOEMExpenseIndex}`;
				const expense = firstSheet.getCellByA1(expenseCell.replace('$', '')).value || 0;;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '오은미연금저축') {
			const accountItem = accounts.find(i => i.name === '오은미연금저축' && i.type === 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = oemPensionSavingReturnCell;
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}${oemPensionSavingIndex}`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}${oemPensionSavingExpenseIndex}`;
				const expense = firstSheet.getCellByA1(expenseCell.replace('$', '')).value || 0;;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`;
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		}
	}
	await firstSheet.saveUpdatedCells();

	await firstSheet.loadCells([`B${netAssetIndex}:${colIndex[colIndex.length - 1]}${netAssetInflationIndex}`]);

	const flowList = [];
	const flowInflationList = [];

	for (let j = 0; j < colIndex.length; j++) {
		flowList.push(firstSheet.getCellByA1(`${colIndex[j]}${netAssetIndex}`).value);
	}
	for (let j = 0; j < colIndex.length; j++) {
		flowInflationList.push(firstSheet.getCellByA1(`${colIndex[j]}${netAssetInflationIndex}`).value);
	}

	for (let i = 0; i < yearList.length; i++) {
		data.push({
			year: yearList[i],
			amount: flowInflationList[i],
			amountInflation: flowList[i]
		});
	}

	console.log('Last: ', flowList[colIndex.length - 1]);

	console.log('cells updated');

	return data;
};