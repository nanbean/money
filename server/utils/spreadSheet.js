const config = require('../config');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const { getExchangeRate } = require('../services/settingService');

// Initialize the sheet - doc ID is the long id in the sheets URL
const doc = new GoogleSpreadsheet(config.googleSpreadsheetDocId);

exports.getLifetimeFlowList = async (accounts) => {
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

	const firstSheet = doc.sheetsByIndex[0];

	// A열 스캔으로 실제 데이터 마지막 행 동적 결정 후 B열 함께 로드
	const scanRow = 150;
	await firstSheet.loadCells([`A1:A${scanRow}`, `B1:B${scanRow}`]);
	const aColumnScan = Array(scanRow).fill().map((_, i) => firstSheet.getCellByA1(`A${i + 1}`).value);
	const maxRow = aColumnScan.reduce((last, v, i) => v !== null ? i + 1 : last, 0) + 5;

	const currentYear = firstSheet.getCellByA1('B1').value;
	const yearTotalLength = endYear - currentYear + 1;
	while (colIndex.length > yearTotalLength) {
		colIndex.pop();
	}
	for (let year = currentYear; year <= endYear; year++ ) {
		yearList.push(year);
	}

	// 스캔 데이터 재사용 (이미 로드됨)
	const aColumn = aColumnScan.slice(0, maxRow);
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
	const netFlowIndex = getIndex('수입-지출+저축') + 1;
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
		`B${reminderIndex}:${colIndex[colIndex.length - 1]}${reminderIndex}`,
		`B${netFlowIndex}:${colIndex[colIndex.length - 1]}${netFlowIndex}`
	]);

	const monthGap = 12 - moment().month() - 1;
	const accountMap = accounts.reduce((acc, account) => {
		acc[account.name] = account;
		return acc;
	}, {});

	// 수익률 재정의 맵 (셀을 draft 모드로 설정한 경우 .value 읽기 불가 → 여기서 값 관리)
	const rateOverrides = {};

	// 계정별 처리 함수
	const processAccount = (accountName, type, returnCell, savingIndex, expenseIndex) => {
		const rowNumber = aColumn.findIndex(i => i === accountName) + 1;
		if (rowNumber <= 0) return;

		const accountItem = accountMap[accountName];
		if (!accountItem || accountItem.type !== type) return;

		firstSheet.getCellByA1(`B${rowNumber}`).value = accountItem.balance;
		const cellRef = returnCell.replace(/\$/g, '');
		const expect = rateOverrides[cellRef] ?? firstSheet.getCellByA1(cellRef).value;

		for (let j = 1; j < colIndex.length; j++) {
			const year = currentYear + j - 1;
			const isSecondYear = year === currentYear;
			const prevYear = firstSheet.getCellByA1(`${colIndex[j - 1]}${rowNumber}`)._draftData.value;
			const saving = savingIndex ? (firstSheet.getCellByA1(`${colIndex[j - 1]}${savingIndex}`).value || 0) : 0;
			const expense = expenseIndex ? (firstSheet.getCellByA1(`${colIndex[j]}${expenseIndex}`).value || 0) : 0;
			
			const factor = isSecondYear ? monthGap / 12 : 1;
			const result = prevYear +
				prevYear * expect * factor +
				saving * factor * (1 + expect * factor / 2) -
				expense;

			if (result === 0) {
				firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).value = 0;
			} else {
				const factorExpr = `IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`;
				const formula = `=${colIndex[j - 1]}${rowNumber}+${colIndex[j - 1]}${rowNumber}*(${returnCell}*${factorExpr})` +
					(savingIndex ? `+${colIndex[j - 1]}${savingIndex}*${factorExpr}*(1+${returnCell}*${factorExpr}/2)` : '') +
					(expenseIndex ? `-${colIndex[j]}${expenseIndex}` : '');

				firstSheet.getCellByA1(`${colIndex[j]}${rowNumber}`).formula = formula;
			}
		}
	};

	// B. 주식수익률 3% → 6.5%
	const stockReturnRow = bColumn.findIndex(i => i === '주식수익률') + 1;
	if (stockReturnRow > 0) {
		firstSheet.getCellByA1(`A${stockReturnRow}`).value = 0.065;
		rateOverrides[`A${stockReturnRow}`] = 0.065;
	}

	// 계정 처리
	processAccount('키움증권', 'Invst', returnCells.stock, reminderIndex);
	processAccount('동양종금장마', 'Invst', returnCells.houseSaving, indices.houseSaving);
	processAccount('몬쁭스SK증권', 'Invst', returnCells.stock);
	processAccount('IRP', 'Invst', returnCells.irp, indices.irpSaving, indices.irpExpense);
	processAccount('연금저축', 'Invst', returnCells.pensionSaving, indices.pensionSavingSaving, indices.pensionSavingExpense);
	processAccount('IRP오은미', 'Invst', returnCells.irpOEM, indices.irpOEMSaving, indices.irpOEMExpense);
	processAccount('오은미연금저축', 'Invst', returnCells.oemPensionSaving, indices.oemPensionSaving, indices.oemPensionSavingExpense);

	// 주택융자금 투자 (Snaptrade US 포트폴리오 현재값으로 B열 업데이트)
	const loanInvestRow          = getIndex('주택융자금(투자)') + 1;
	const loanDebtRow            = getIndex('주택융자금(부채)') + 1;
	const loanInterestExpenseRow = getIndex('주택융자금(이자)') + 1;
	const loanRepayRow           = getIndex('주택융자금(상환)') + 1;
	const minusLoanRowEarly      = getIndex('마이너스통장') + 1;  // cascade 전에 미리 계산
	let   loanRateRow            = bColumn.findIndex(i => i === '주택융자금이자') + 1;

	if (loanRateRow <= 0) {
		const emptyRow = bColumn.findIndex((v, i) => !v && i >= maxRow - 10) + 1;
		loanRateRow = emptyRow > 0 ? emptyRow : maxRow;
		firstSheet.getCellByA1(`A${loanRateRow}`).value = 0.0524;
		firstSheet.getCellByA1(`B${loanRateRow}`).value = '주택융자금이자';
		rateOverrides[`A${loanRateRow}`] = 0.0524;
	}
	const loanRateRef = `$A${loanRateRow}`;

	// 주택융자금(투자) B열: USStock 계좌 현재 잔액으로 업데이트
	if (loanInvestRow > 0) {
		const usStockAccount = accounts.find(a => a.name === 'USStock');
		if (usStockAccount) {
			try {
				let balance = usStockAccount.balance;
				if (usStockAccount.currency === 'USD') {
					const exchangeRate = await getExchangeRate();
					balance = Math.round(balance * exchangeRate);
				}
				if (!isNaN(balance) && balance > 0) {
					firstSheet.getCellByA1(`B${loanInvestRow}`).value = balance;
					console.log(`[loanInvest] USStock 잔액: ${balance.toLocaleString()}`);
				} else {
					console.warn(`[loanInvest] USStock 잔액 비정상(${balance}), B열 유지`);
				}
			} catch (err) {
				console.error('[loanInvest] USStock 업데이트 실패, B열 현재가 유지:', err.message);
			}
		}
	}

	// 주택융자금(투자): 수익률로만 성장, 상환액은 지출(수입-지출)로 처리되므로 여기서 차감 안 함
	// 레버리지 잉여분(투자>부채)으로 마이너스통장 상환만 적용
	if (loanInvestRow > 0) {
		for (let j = 1; j < colIndex.length; j++) {
			const factorExpr   = `IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`;
			const prevRef      = `${colIndex[j-1]}${loanInvestRow}`;
			const prevDebtRef  = `${colIndex[j-1]}${loanDebtRow}`;
			const prevMinusRef = `${colIndex[j-1]}${minusLoanRowEarly}`;
			const minusRepayExpr = (minusLoanRowEarly > 0 && loanDebtRow > 0)
				? `MIN(MAX(0,${prevRef}+${prevDebtRef}),MAX(0,-${prevMinusRef}))`
				: '0';
			firstSheet.getCellByA1(`${colIndex[j]}${loanInvestRow}`).formula =
				`=MAX(0,${prevRef}+${prevRef}*(${returnCells.stock}*${factorExpr})-${minusRepayExpr})`;
		}
	}

	// 주택융자금(부채): 상환액만큼 감소 (이자는 지출 항목으로 별도 처리)
	if (loanDebtRow > 0 && loanRepayRow > 0) {
		for (let j = 1; j < colIndex.length; j++) {
			const prevRef  = `${colIndex[j-1]}${loanDebtRow}`;
			const repayRef = `${colIndex[j]}${loanRepayRow}`;
			firstSheet.getCellByA1(`${colIndex[j]}${loanDebtRow}`).formula =
				`=MIN(0,${prevRef}+${repayRef})`;
		}
	}

	// 주택융자금(이자): 부채잔액 × 이자율 → 연간 지출 (factor 없이 전체 연도 기준)
	if (loanInterestExpenseRow > 0 && loanDebtRow > 0) {
		firstSheet.getCellByA1(`B${loanInterestExpenseRow}`).formula =
			`=-B${loanDebtRow}*${loanRateRef}`;
		for (let j = 1; j < colIndex.length; j++) {
			firstSheet.getCellByA1(`${colIndex[j]}${loanInterestExpenseRow}`).formula =
				`=-${colIndex[j-1]}${loanDebtRow}*${loanRateRef}`;
		}
	}

	// A. 키움증권 ↔ 마이너스통장 cascade
	const minusLoanRow = getIndex('마이너스통장') + 1;  // 주택융자금 섹션에서도 참조
	let minusRateRow = bColumn.findIndex(i => i === '마이너스통장이자') + 1;
	// 마이너스통장 이자율 행이 없으면 빈 행에 생성
	if (minusRateRow <= 0) {
		const emptyRow = bColumn.findIndex(i => !i) + 1;
		minusRateRow = emptyRow > 0 ? emptyRow : maxRow;
		firstSheet.getCellByA1(`A${minusRateRow}`).value = 0.05;
		firstSheet.getCellByA1(`B${minusRateRow}`).value = '마이너스통장이자';
		rateOverrides[`A${minusRateRow}`] = 0.05;
	}
	const minusRateRef = `$A${minusRateRow}`;

	const kiwoomRow = aColumn.findIndex(i => i === '키움증권') + 1;
	if (kiwoomRow > 0 && minusLoanRow > 0) {
		firstSheet.getCellByA1(`B${minusLoanRow}`).value = 0;
		for (let j = 1; j < colIndex.length; j++) {
			const kiwoomCell = firstSheet.getCellByA1(`${colIndex[j]}${kiwoomRow}`);
			const minusCell = firstSheet.getCellByA1(`${colIndex[j]}${minusLoanRow}`);
			const kiwoomFormula = kiwoomCell._draftData?.value;
			if (!kiwoomFormula) continue;
			const factorExpr = `IF(YEAR(TODAY())=${colIndex[j]}$1-1,(12-MONTH(TODAY()))/12,1)`;
			const kiwoomBody   = kiwoomFormula.replace(/^=/, '');
			const prevMinusRef = `${colIndex[j - 1]}${minusLoanRow}`;
			// available = 키움증권 자연값 + 대출잔액*(1+이자율*factor) + 레버리지 잉여 상환분
			let availableExpr = `${kiwoomBody}+${prevMinusRef}*(1+${minusRateRef}*${factorExpr})`;
			if (loanInvestRow > 0 && loanDebtRow > 0) {
				const prevInvRef  = `${colIndex[j-1]}${loanInvestRow}`;
				const prevDebtRef = `${colIndex[j-1]}${loanDebtRow}`;
				const minusRepayExpr = `MIN(MAX(0,${prevInvRef}+${prevDebtRef}),MAX(0,-${prevMinusRef}))`;
				availableExpr += `+${minusRepayExpr}`;
			}
			kiwoomCell.formula = `=MAX(0,${availableExpr})`;
			minusCell.formula = `=MIN(0,${availableExpr})`;
		}
	}

	// 이벤트 및 netFlow 수집 (saveUpdatedCells 전, 로드된 셀에서 읽기)
	const events = [];

	// `!` 로 시작하는 노트는 단순 정보(코멘트)로 취급해 events 로 저장하지 않음
	const isInformational = (note) => typeof note === 'string' && note.trimStart().startsWith('!');

	const scanSection = (startRow, endRow, type) => {
		let found = 0;
		let skipped = 0;
		for (let row = startRow; row <= endRow; row++) {
			const rowLabel = aColumn[row - 1] || '';
			for (let j = 0; j < colIndex.length; j++) {
				try {
					const cell = firstSheet.getCellByA1(`${colIndex[j]}${row}`);
					if (cell && cell.note) {
						if (isInformational(cell.note)) {
							skipped++;
							continue;
						}
						events.push({ year: yearList[j], label: cell.note, type, row: rowLabel });
						found++;
					}
				} catch (e) { /* 셀 접근 실패 무시 */ }
			}
		}
		console.log(`[events] ${type} section (rows ${startRow}-${endRow}): ${found} notes found${skipped ? `, ${skipped} info-only skipped` : ''}`);
	};

	// 연도 헤더(row 1) 메모 → type: 'year'
	for (let j = 0; j < colIndex.length; j++) {
		try {
			const cell = firstSheet.getCellByA1(`${colIndex[j]}1`);
			if (cell && cell.note && !isInformational(cell.note)) {
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
	const netFlowList = colIndex.map(col => firstSheet.getCellByA1(`${col}${netFlowIndex}`).value);

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