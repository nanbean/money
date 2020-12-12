const Excel = require('exceljs');
const moment = require('moment');

exports.getLifetimeFlowList = (accounts) => {
	return new Promise(resolve => {
		const fileName = `${__dirname}/lifetimePlanner.xlsx`;
		const workbook = new Excel.Workbook();
		workbook.calcProperties.fullCalcOnLoad = true;
		workbook.xlsx.readFile(fileName)
			.then(function () {
				const worksheet = workbook.getWorksheet(1);
				const nameCol = worksheet.getColumn('A');
				let yearRowNum = -1;
				let flowRowNum = -1;
				let netWorth = [];
				const data = [];
				const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
				const colIndex = [
					...alphabet.slice(1, alphabet.length),
					...alphabet.map((i, index) => 'A' + alphabet[index]),
					'BA'
				];

				nameCol.eachCell(function (cell, rowNumber) {
					const accountItem = accounts.find(i => i.name === cell.value && i.type == 'Invst');

					if (accountItem) {
						worksheet.getCell(`B${rowNumber}`).value = accountItem.balance;
						netWorth[0] = netWorth[0] ? netWorth[0] + accountItem.balance : accountItem.balance;
						if (accountItem.name === '키움증권') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$74';
								const expect = worksheet.getCell(expectCell).value;
								const remainderCell = `${colIndex[j - 1]}67`;
								const remainder = worksheet.getCell(remainderCell).value.result;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + remainder * (isSecondYear ? monthGap / 12 : 1);
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${remainderCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === '키움증권맥쿼리') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$74';
								const expect = worksheet.getCell(expectCell).value;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1);
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === '교보변액연금보험') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$75';
								const expect = worksheet.getCell(expectCell).value;
								const savingCell = `${colIndex[j - 1]}63`;
								const savingCellValue = worksheet.getCell(savingCell).value;
								const saving = savingCellValue && savingCellValue.formula ? savingCellValue.result : savingCellValue;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1);
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === '동양종금장마') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$73';
								const expect = worksheet.getCell(expectCell).value;
								const savingCell = `${colIndex[j - 1]}62`;
								const savingCellValue = worksheet.getCell(savingCell).value;
								const saving = savingCellValue && savingCellValue.formula ? savingCellValue.result : savingCellValue;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1);
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === '몬쁭스SK증권') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$74';
								const expect = worksheet.getCell(expectCell).value;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1);
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === 'IRP') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$74';
								const expect = worksheet.getCell(expectCell).value;
								const savingCell = `${colIndex[j - 1]}60`;
								const savingCellValue = worksheet.getCell(savingCell).value;
								const saving = savingCellValue && savingCellValue.formula ? savingCellValue.result : savingCellValue;
								const expenseCell = `${colIndex[j]}20`;
								const expenseCellValue = worksheet.getCell(expenseCell).value;
								const expense = expenseCellValue && expenseCellValue.formula ? expenseCellValue.result : expenseCellValue;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === '연금저축') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$74';
								const expect = worksheet.getCell(expectCell).value;
								const savingCell = `${colIndex[j - 1]}61`;
								const savingCellValue = worksheet.getCell(savingCell).value;
								const saving = savingCellValue && savingCellValue.formula ? savingCellValue.result : savingCellValue;
								const expenseCell = `${colIndex[j]}22`;
								const expenseCellValue = worksheet.getCell(expenseCell).value;
								const expense = expenseCellValue && expenseCellValue.formula ? expenseCellValue.result : expenseCellValue;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
						if (accountItem.name === 'IRP오은미') {
							for (let j = 1; j < colIndex.length; j++) {
								const year = worksheet.getCell(`${colIndex[j]}1`).value;
								const isSecondYear = year - 1 === moment().year();
								const monthGap = 12 - moment().month() - 1; // month() return 0 - 11
								const prevYearCellValue = worksheet.getCell(`${colIndex[j - 1]}${rowNumber}`).value;
								const prevYear = prevYearCellValue.formula ? prevYearCellValue.result : prevYearCellValue;
								const expectCell = '$A$74';
								const expect = worksheet.getCell(expectCell).value;
								const savingCell = `${colIndex[j - 1]}64`;
								const savingCellValue = worksheet.getCell(savingCell).value;
								const saving = savingCellValue && savingCellValue.formula ? savingCellValue.result : savingCellValue;
								const expenseCell = `${colIndex[j]}24`;
								const expenseCellValue = worksheet.getCell(expenseCell).value;
								const expense = expenseCellValue && expenseCellValue.formula ? expenseCellValue.result : expenseCellValue;
								const result = prevYear + prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + saving * (isSecondYear ? monthGap / 12 : 1) - expense;
								worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = {
									formula: `${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${expectCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))+${savingCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)-${expenseCell}`,
									result
								};
								netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
							}
						}
					}
					if (cell.value === 'Year') {
						yearRowNum = rowNumber;
					}
					if (cell.value === '자산') {
						flowRowNum = rowNumber;
						worksheet.getCell(`B${rowNumber}`).value = { formula: 'SUM(B48:B56)', result: netWorth[0] ? netWorth[0] : undefined };
						worksheet.getCell(`B${rowNumber + 1}`).value = { formula: 'B57', result: netWorth[0] ? netWorth[0] : undefined };
						for (let j = 1; j < colIndex.length; j++) {
							const inflationCell = '$A$71';
							const startYearCell = '$B$1';
							const startYear = worksheet.getCell(startYearCell).value;
							const yearCell = `${colIndex[j]}1`;
							const year = worksheet.getCell(yearCell).value;
							const inflation = worksheet.getCell(inflationCell).value;
							worksheet.getCell(`${colIndex[j]}${rowNumber}`).value = { formula: `SUM(${colIndex[j]}48:${colIndex[j]}56)`, result: netWorth[j] ? netWorth[j] : undefined };
							worksheet.getCell(`${colIndex[j]}${rowNumber + 1}`).value = { formula: `${colIndex[j]}${rowNumber}/((1+${inflationCell})^(${yearCell}-${startYearCell}))`, result: netWorth[j] / Math.pow(1 + inflation, year - startYear) };
						}
					}
				});
				var yearList = worksheet.getRow(yearRowNum).values.filter(i => Number.isInteger(i)).map(i => i);
				var flowList = worksheet.getRow(flowRowNum).values.filter(i => i.result).map(i => i.result);
				var flowInflationList = worksheet.getRow(flowRowNum + 1).values.filter(i => i.result).map(i => i.result);

				for (let i = 0; i < yearList.length; i++) {
					data.push({
						year: yearList[i],
						amount: flowInflationList[i],
						amountInflation: flowList[i]
					});
				}

				workbook.xlsx.writeFile(fileName).then(function () {
				});

				resolve(data);
			});
	});
};