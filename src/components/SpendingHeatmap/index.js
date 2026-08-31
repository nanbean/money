import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import TransactionListDialog from '../TransactionListDialog';
import { flattenExpenseRows } from '../../utils/expense';

const INTENSITY_COLORS = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const CELL_GAP = 2;
const COLS = 13;
const ROWS = 7;

export default function SpendingHeatmap () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const accountList = useSelector((state) => state.accountList);
	const { currency, exchangeRate } = useSelector((state) => state.settings);

	const containerRef = useRef(null);
	const [containerWidth, setContainerWidth] = useState(300);
	const [dialogDate, setDialogDate] = useState(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const DAY_LABEL_WIDTH = Math.ceil(containerWidth * 0.08);
	const cellSize = Math.floor((containerWidth - DAY_LABEL_WIDTH - CELL_GAP * (COLS - 1)) / COLS);
	const cellStep = cellSize + CELL_GAP;
	const fontSize = Math.max(8, Math.round(cellSize * 0.5));
	const TOP_LABEL_HEIGHT = fontSize + CELL_GAP * 4;
	const dynSvgHeight = TOP_LABEL_HEIGHT + ROWS * cellStep;

	const accountCurrencyMap = useMemo(() => {
		const map = {};
		accountList.forEach(a => { map[a._id] = a.currency || 'KRW'; });
		return map;
	}, [accountList]);

	const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;

	const toDisplayAmount = (tx) => {
		const abs = Math.abs(tx.amount);
		const txCurrency = accountCurrencyMap[tx.accountId] || 'KRW';
		if (txCurrency === currency) return abs;
		if (txCurrency === 'KRW') return abs / validExchangeRate;
		return abs * validExchangeRate;
	};

	// 분할 거래를 펼쳐야 급여에서 원천 공제된 지출이 빠지지 않는다. 계좌 종류·부호·
	// 계좌간 이체 판정은 Spending 과 같은 유틸을 쓴다 (같은 페이지에서 숫자가 어긋나면 안 된다).
	const dailyRows = useMemo(() => {
		const threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');
		// 미래 날짜 거래(카드 결제 예정분 등)는 제외한다. 격자에는 오늘까지만 그려지지만
		// 색 농도 기준(p25/p50/p75)이 그 값들까지 포함해 계산되어 전체가 흐려진다.
		const today = moment().format('YYYY-MM-DD');
		const byDate = {};
		flattenExpenseRows(allAccountsTransactions)
			.filter(t => t.date >= threeMonthsAgo && t.date <= today)
			.forEach(t => {
				if (!byDate[t.date]) byDate[t.date] = [];
				byDate[t.date].push(t);
			});
		return byDate;
	}, [allAccountsTransactions]);

	const heatmapData = useMemo(() => {
		const dailyMap = {};
		Object.entries(dailyRows).forEach(([date, rows]) => {
			dailyMap[date] = rows.reduce((sum, t) => sum + toDisplayAmount(t), 0);
		});
		return dailyMap;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dailyRows, accountCurrencyMap, currency, validExchangeRate]);

	const { p25, p50, p75 } = useMemo(() => {
		const values = Object.values(heatmapData).filter(v => v > 0).sort((a, b) => a - b);
		if (values.length === 0) return { p25: 0, p50: 0, p75: 0 };
		const p = (pct) => values[Math.floor(values.length * pct)] || 0;
		return { p25: p(0.25), p50: p(0.50), p75: p(0.75) };
	}, [heatmapData]);

	const getIntensity = (amount) => {
		if (!amount) return 0;
		if (amount < p25) return 1;
		if (amount < p50) return 2;
		if (amount < p75) return 3;
		return 4;
	};

	const startDate = useMemo(() => moment().subtract(13, 'weeks').startOf('isoWeek'), []);

	const monthLabels = useMemo(() => {
		const labels = [];
		let lastMonth = null;
		for (let col = 0; col < COLS; col++) {
			const date = startDate.clone().add(col * 7, 'days');
			const month = date.format('M월');
			if (month !== lastMonth) {
				labels.push({ col, label: month });
				lastMonth = month;
			}
		}
		return labels;
	}, [startDate]);

	// 페이지를 떠나지 않고 그 날의 내역을 팝업으로 보여준다 (Spending 의 다른 드릴다운과 동일).
	const handleCellClick = (dateStr) => setDialogDate(dateStr);

	const dialogTransactions = useMemo(
		() => [...(dailyRows[dialogDate] || [])].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
		[dailyRows, dialogDate]
	);

	return (
		<Box>
			<Box ref={containerRef}>
				<svg width="100%" height={dynSvgHeight}>
					{/* 월 레이블 */}
					{monthLabels.map(({ col, label }) => (
						<text
							key={col}
							x={DAY_LABEL_WIDTH + col * cellStep}
							y={fontSize}
							fontSize={fontSize}
							fill="#888"
						>
							{label}
						</text>
					))}
					{/* 요일 레이블 */}
					{DAY_LABELS.map((day, row) => (
						<text
							key={day}
							x={DAY_LABEL_WIDTH - CELL_GAP}
							y={TOP_LABEL_HEIGHT + row * cellStep + cellSize - 2}
							fontSize={fontSize}
							fill="#888"
							textAnchor="end"
						>
							{row % 2 === 0 ? day : ''}
						</text>
					))}
					{/* 히트맵 셀 */}
					{Array.from({ length: COLS }, (_, col) =>
						Array.from({ length: ROWS }, (_, row) => {
							const date = startDate.clone().add(col * 7 + row, 'days');
							const dateStr = date.format('YYYY-MM-DD');
							const intensity = getIntensity(heatmapData[dateStr]);
							const isFuture = date.isAfter(moment(), 'day');
							return (
								<rect
									key={dateStr}
									x={DAY_LABEL_WIDTH + col * cellStep}
									y={TOP_LABEL_HEIGHT + row * cellStep}
									width={cellSize}
									height={cellSize}
									rx={2}
									fill={isFuture ? 'transparent' : INTENSITY_COLORS[intensity]}
									style={{ cursor: intensity > 0 ? 'pointer' : 'default' }}
									onClick={() => !isFuture && intensity > 0 && handleCellClick(dateStr)}
								>
									<title>{dateStr}{heatmapData[dateStr] ? `: ${Math.round(heatmapData[dateStr]).toLocaleString()}` : ''}</title>
								</rect>
							);
						})
					)}
				</svg>
			</Box>
			{/* 범례 */}
			<Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
				<Typography variant="caption" color="text.secondary">없음</Typography>
				{INTENSITY_COLORS.map((color, i) => (
					<Box key={i} sx={{ width: 10, height: 10, bgcolor: color, borderRadius: '2px', border: '1px solid #ddd' }} />
				))}
				<Typography variant="caption" color="text.secondary">많음</Typography>
			</Stack>

			<TransactionListDialog
				open={!!dialogDate}
				onClose={() => setDialogDate(null)}
				title={dialogDate || ''}
				transactions={dialogTransactions}
				accountCurrencyMap={accountCurrencyMap}
				currency={currency}
				total={Math.round(dialogTransactions.reduce((s, tx) => s + toDisplayAmount(tx), 0))}
			/>
		</Box>
	);
}
