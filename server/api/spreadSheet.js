const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');

const key = require('../nanbean-435f267e8481.json');

// Initialize the sheet - doc ID is the long id in the sheets URL
const doc = new GoogleSpreadsheet('1pJn7fykSr3hvJN6qOcS9hIcBDtW7AVbcVwm61dcpeBg');

exports.getLifetimeFlowList = async (accounts) => {
	await doc.useServiceAccountAuth({
		client_email: key.client_email,
		private_key: key.private_key,
	});

	await doc.loadInfo(); // loads document properties and worksheets

	const firstSheet = doc.sheetsByIndex[0];
	// reduced range because of memory
	await firstSheet.loadCells(['A48:AZ58', 'A20:AZ24', 'A60:AZ64', 'A67:AZ67','A71:A83']);
	console.log('cells loaded');

	let netWorth = [];
	const data = [];
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	const colIndex = [
		...alphabet.slice(1, alphabet.length),
		...alphabet.map((i, index) => 'A' + alphabet[index])
	];
	const currentYear = moment().year();
	const endYear = 2072;
	const yearList = [];
	const yearTotalLength = endYear - currentYear + 1; // 2072 - current year
	while (colIndex.length > yearTotalLength) {
		colIndex.pop();
	}
	for (let year = currentYear; year <= endYear; year++ ) {
		yearList.push(year);
	}

	for (let rowNumber = 48; rowNumber <= 56; rowNumber++) {
		if (firstSheet.getCellByA1(`A${rowNumber}`).value === '키움증권') {
			const accountItem = accounts.find(i => i.name === '키움증권' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A74';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const remainderCell = `${colIndex[j - 1]}67`;
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
			const accountItem = accounts.find(i => i.name === '교보변액연금보험' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A75';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}63`;
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
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '동양종금장마') {
			const accountItem = accounts.find(i => i.name === '동양종금장마' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A73';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}62`;
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
			const accountItem = accounts.find(i => i.name === '몬쁭스SK증권' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A74';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1);
				if (result === 0) {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
				} else {
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = result;
					firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))`
				}
				netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === 'IRP') {
			const accountItem = accounts.find(i => i.name === 'IRP' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A76';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}60`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}20`;
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
			const accountItem = accounts.find(i => i.name === '연금저축' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A77';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}61`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}22`;
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
			const accountItem = accounts.find(i => i.name === 'IRP오은미' && i.type == 'Invst');
			firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
			for (let j = 1; j < colIndex.length; j++) {
				const year = currentYear + j - 1;
				const isSecondYear = year - 1 === currentYear;
				const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
				const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
				const expectCell = '$A78';
				const expect = firstSheet.getCellByA1(expectCell.replace('$', '')).value;
				const savingCell = `${colIndex[j - 1]}64`;
				const saving = firstSheet.getCellByA1(savingCell.replace('$', '')).value || 0;
				const expenseCell = `${colIndex[j]}24`;
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

	const flowList = [];
	const flowInflationList = [];

	await firstSheet.loadCells(['A57:AZ58']);

	for (let rowNumber = 57; rowNumber <= 58; rowNumber++) {
		if (firstSheet.getCellByA1(`A${rowNumber}`).value === '자산') {
			for (let j = 0; j < colIndex.length; j++) {
				flowList.push(firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value);
			}
		} else if (firstSheet.getCellByA1(`A${rowNumber}`).value === '자산인플레이션') {
			for (let j = 0; j < colIndex.length; j++) {
				flowInflationList.push(firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value);
			}
		}
	}

	for (let i = 0; i < yearList.length; i++) {
		data.push({
			year: yearList[i],
			amount: flowInflationList[i],
			amountInflation: flowList[i]
		});
	}
	console.log('cells updated');

	return data;
};