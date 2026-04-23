const config = require('../config');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');

// Initialize the sheet - doc ID is the long id in the sheets URL
const doc = new GoogleSpreadsheet(config.googleSpreadsheetDocId);

exports.getLifetimeFlowList = async (accounts) => {
	let netWorth = [];
	const resultData = [];
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

	await doc.loadInfo();

	const maxRow = 90;
	const firstSheet = doc.sheetsByIndex[0];
	
	await firstSheet.loadCells([`A1:A${maxRow}`, `B1:B${maxRow}`]);

	const currentYear = firstSheet.getCellByA1('B1').value;
	const yearTotalLength = endYear - currentYear + 1;
	while (colIndex.length > yearTotalLength) {
		colIndex.pop();
	}
	for (let year = currentYear; year <= endYear; year++ ) {
		yearList.push(year);
	}

	// 한 번에 모든 열 데이터 로드
	const aColumn = Array(maxRow).fill().map((_, idx) => firstSheet.getCellByA1(`A${idx + 1}`).value);
	const bColumn = Array(maxRow).fill().map((_, idx) => firstSheet.getCellByA1(`B${idx + 1}`).value);

	// 인덱스 계산
	const getIndex = (searchValue) => aColumn.findIndex(i => i === searchValue);
	const assetItemStartIndex = getIndex('지출') + 2;
	const assetItemEndIndex = getIndex('자산');
	const netAssetIndex = assetItemEndIndex + 1;
	const netAssetInflationIndex = netAssetIndex + 1;
	const withdrawStartIndex = getIndex('연금인출') + 1;
	const withdrawEndIndex = getIndex('수입');
	const expenseStartIndex = getIndex('수입') + 1;
	const expenseEndIndex = getIndex('지출') - 1;
	const reminderIndex = getIndex('수입-지출') + 1;
	const savingStartIndex = netAssetInflationIndex + 1;
	const savingEndIndex = reminderIndex - 1;

	// 수익률 셀 참조 미리 계산
	const returnCells = {
		stock: `$A${bColumn.findIndex(i => i === '주식수익률') + 1}`,
		irp: `$A${bColumn.findIndex(i => i === 'IRP수익률') + 1}`,
		pensionSaving: `$A${bColumn.findIndex(i => i === '연금저축수익률') + 1}`,
		irpOEM: `$A${bColumn.findIndex(i => i === 'IRP오은미수익률') + 1}`,
		oemPensionSaving: `$A${bColumn.findIndex(i => i === '오은미연금저축수익률') + 1}`,
		houseSaving: `$A${bColumn.findIndex(i => i === '장마수익률') + 1}`
	};

	// 저축 및 지출 인덱스 미리 계산
	const indices = {
		irpSaving: getIndex('IRP저축') + 1,
		irpExpense: getIndex('IRP 연금') + 1,
		pensionSavingSaving: getIndex('연금저축저축') + 1,
		pensionSavingExpense: getIndex('연금저축연금') + 1,
		irpOEMSaving: getIndex('IRP오은미저축') + 1,
		irpOEMExpense: getIndex('IRP 오은미 연금') + 1,
		oemPensionSaving: getIndex('오은미연금저축저축') + 1,
		oemPensionSavingExpense: getIndex('오은미 연금저축 연금') + 1,
		houseSaving: getIndex('장마저축') + 1
	};

	// 필요한 범위를 개별적으로 로드 (B1: 연도 헤더 메모 포함)
	await firstSheet.loadCells([
		`B1:${colIndex[colIndex.length - 1]}1`,
		`B${expenseStartIndex}:${colIndex[colIndex.length - 1]}${expenseEndIndex}`,
		`B${assetItemStartIndex}:${colIndex[colIndex.length - 1]}${assetItemEndIndex}`,
		`B${netAssetIndex}:${colIndex[colIndex.length - 1]}${netAssetInflationIndex}`,
		`B${withdrawStartIndex}:${colIndex[colIndex.length - 1]}${withdrawEndIndex}`,
		`B${savingStartIndex}:${colIndex[colIndex.length - 1]}${savingEndIndex}`,
		`B${reminderIndex}:${colIndex[colIndex.length - 1]}${reminderIndex}`
	]);

	const monthGap = 12 - moment().month() - 1;
	const accountMap = accounts.reduce((acc, account) => {
		acc[account.name] = account;
		return acc;
	}, {});

	// 계정별 처리 함수
	const processAccount = (accountName, type, returnCell, savingIndex, expenseIndex) => {
		const rowNumber = aColumn.findIndex(i => i === accountName) + 1;
		if (rowNumber <= 0) return;

		const accountItem = accountMap[accountName];
		if (!accountItem || accountItem.type !== type) return;

		firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
		const expect = firstSheet.getCellByA1(returnCell.replace('$', '')).value;

		for (let j = 1; j < colIndex.length; j++) {
			const year = currentYear + j - 1;
			const isSecondYear = year - 1 === currentYear;
			const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
			const saving = savingIndex ? (firstSheet.getCellByA1(`${colIndex[j - 1]}${savingIndex}`).value || 0) : 0;
			const expense = expenseIndex ? (firstSheet.getCellByA1(`${colIndex[j]}${expenseIndex}`).value || 0) : 0;
			
			const result = prevYear + 
				prevYear * expect * (isSecondYear ? monthGap / 12 : 1) + 
				saving * (isSecondYear ? monthGap / 12 : 1) - 
				expense;

			if (result === 0) {
				firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
			} else {
				const formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${returnCell}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1))` +
					(savingIndex ? `+${colIndex[j - 1]}${savingIndex}*IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)` : '') +
					(expenseIndex ? `-${colIndex[j]}${expenseIndex}` : '');
				
				firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = formula;
			}
			netWorth[j] = netWorth[j] ? netWorth[j] + result : result;
		}
	};

	// 계정 처리
	processAccount('키움증권', 'Invst', returnCells.stock, reminderIndex);
	processAccount('동양종금장마', 'Invst', returnCells.houseSaving, indices.houseSaving);
	processAccount('몬쁭스SK증권', 'Invst', returnCells.stock);
	processAccount('IRP', 'Invst', returnCells.irp, indices.irpSaving, indices.irpExpense);
	processAccount('연금저축', 'Invst', returnCells.pensionSaving, indices.pensionSavingSaving, indices.pensionSavingExpense);
	processAccount('IRP오은미', 'Invst', returnCells.irpOEM, indices.irpOEMSaving, indices.irpOEMExpense);
	processAccount('오은미연금저축', 'Invst', returnCells.oemPensionSaving, indices.oemPensionSaving, indices.oemPensionSavingExpense);

	// 이벤트 및 netFlow 수집 (saveUpdatedCells 전, 로드된 셀에서 읽기)
	const events = [];

	const scanSection = (startRow, endRow, type) => {
		let found = 0;
		for (let row = startRow; row <= endRow; row++) {
			const rowLabel = aColumn[row - 1] || '';
			for (let j = 0; j < colIndex.length; j++) {
				try {
					const cell = firstSheet.getCellByA1(`${colIndex[j]}${row}`);
					if (cell && cell.note) {
						events.push({ year: yearList[j], label: cell.note, type, row: rowLabel });
						found++;
					}
				} catch (e) { /* 셀 접근 실패 무시 */ }
			}
		}
		console.log(`[events] ${type} section (rows ${startRow}-${endRow}): ${found} notes found`);
	};

	// 연도 헤더(row 1) 메모 → type: 'year'
	for (let j = 0; j < colIndex.length; j++) {
		try {
			const cell = firstSheet.getCellByA1(`${colIndex[j]}1`);
			if (cell && cell.note) {
				events.push({ year: yearList[j], label: cell.note, type: 'year' });
			}
		} catch (e) { /* 무시 */ }
	}
	console.log(`[events] year row: ${events.length} notes found`);

	// 실제 지출 항목 영역 메모 (수입 ~ 지출 사이) → type: 'expense'
	scanSection(expenseStartIndex, expenseEndIndex, 'expense');

	// 자산 항목 영역 메모 (지출 ~ 자산 사이) → type: 'expense'
	scanSection(assetItemStartIndex, assetItemEndIndex, 'expense');

	// 저축 영역 메모 → type: 'income' (savingStartIndex ~ savingEndIndex)
	scanSection(savingStartIndex, savingEndIndex, 'income');

	// 수입(연금인출) 영역 메모 → type: 'income' (endIndex 포함, <= 사용)
	scanSection(withdrawStartIndex, withdrawEndIndex, 'income');

	console.log(`[events] total ${events.length} events`);

	// 수입-지출(netFlow) 추출
	const netFlowList = colIndex.map(col => firstSheet.getCellByA1(`${col}${reminderIndex}`).value);

	// 한 번에 모든 셀 저장
	await firstSheet.saveUpdatedCells();

	await firstSheet.loadCells([`B${netAssetIndex}:${colIndex[colIndex.length - 1]}${netAssetInflationIndex}`]);

	// 최종 데이터 수집
	const flowList = colIndex.map(col => firstSheet.getCellByA1(`${col}${netAssetIndex}`).value);
	const flowInflationList = colIndex.map(col => firstSheet.getCellByA1(`${col}${netAssetInflationIndex}`).value);

	yearList.forEach((year, i) => {
		resultData.push({
			year,
			amount: flowInflationList[i],
			amountInflation: flowList[i],
			netFlow: netFlowList[i] || 0
		});
	});

	console.log('Last: ', flowList[colIndex.length - 1]);
	console.log('cells updated');

	return { data: resultData, events };
};