import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import moment from 'moment';

import FilterMenu from '../../components/FilterMenu';
import MonthlyExpenseGrid, { FIRST_COL_WIDTH, VALUE_COLUMN_COUNT } from './MonthlyExpenseGrid';
import TransactionListDialog from '../../components/TransactionListDialog';
import SortMenuButton from '../../components/SortMenuButton';
import MonthlyComparisonChart from './MonthlyComparisonChart';

import useMonthlyExpense from './useMonthlyExpense';
import withParentTotals from './withParentTotals';
import useTransactions from './useTransactions';
import useIncomeReport from './useIncomeReport';
import useExpenseReport from './useExpenseReport';
import useSankeyData from './useSankeyData';
import SankeyChart from './SankeyChart';

import useT from '../../hooks/useT';
import { sDisplay, labelStyle } from '../../utils/designTokens';

import { YEAR_LIST, MONTH_LIST } from '../../constants';

const MonthlyExpense = () => {
	const T = useT();
	const lab = labelStyle(T);

	const location = useLocation();
	const navigate = useNavigate();
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate, currency, livingExpenseExempt = [] } = useSelector((state) => state.settings);

	const [year, setYear] = useState(() => {
		const params = new URLSearchParams(location.search);
		const y = parseInt(params.get('year'), 10);
		return y || parseInt(moment().format('YYYY'), 10);
	});
	const [filters, setFilters] = useState(() => {
		const params = new URLSearchParams(location.search);
		const filtersParam = params.get('filters');
		return filtersParam ? filtersParam.split(',') : [];
	});
	const [view, setView] = useState('grid');
	// { startDate, endDate, category, kind } — 클릭한 셀. 팝업으로 내역을 보여준다.
	const [drill, setDrill] = useState(null);

	const reportView = filters.includes('category') ? 'category' : 'subcategory';
	const usd = currency === 'USD';

	const livingExpenseOnly = filters.includes('livingExpenseOnly');
	const livingExpenseCardOnly = filters.includes('livingExpenseCardOnly');
	const boAOnly = filters.includes('boAOnly');

	const { incomeTransactions, expenseTransactions } = useTransactions(allAccountsTransactions, livingExpenseCardOnly, boAOnly);
	const { incomeReport, totalMonthIncomeSum, totalIncomeSum } = useIncomeReport(accountList, incomeTransactions, year, usd, exchangeRate, reportView);
	const { expenseReport, totalMonthExpenseSum, totalExpenseSum, exemptExpenseSum } = useExpenseReport(accountList, expenseTransactions, year, livingExpenseOnly, usd, exchangeRate, reportView, livingExpenseExempt);
	// 합계 행은 그리드에만 넣는다. 리포트 배열을 그대로 늘리면 totalIncomeSum /
	// totalExpenseSum 과 Sankey 가 같은 금액을 두 번 세게 된다.
	const gridIncomeReport = useMemo(() => withParentTotals(incomeReport, reportView), [incomeReport, reportView]);
	const gridExpenseReport = useMemo(() => withParentTotals(expenseReport, reportView), [expenseReport, reportView]);
	const reportData = useMonthlyExpense(gridIncomeReport, gridExpenseReport, totalMonthIncomeSum, totalIncomeSum, totalMonthExpenseSum, totalExpenseSum, year);
	const { sankeyData } = useSankeyData(incomeReport, expenseReport, totalIncomeSum, totalExpenseSum, exemptExpenseSum);

	const accountCurrencyMap = useMemo(() => {
		const map = {};
		(accountList || []).forEach(a => { map[a._id] = a.currency || 'KRW'; });
		return map;
	}, [accountList]);

	const drillTransactions = useMemo(() => {
		if (!drill) return [];

		// 그리드 행의 키는 reportView 에 따라 'category' 또는 'category:subcategory' 다.
		// 서브카테고리 뷰에서 콜론이 없는 행은 서브카테고리가 없는 거래만 가리킨다.
		// 단, 상위 카테고리 합계 행은 서브카테고리 전체를 포함해야 한다.
		const matchesCategory = (tx, key) => {
			if (!key) return true;
			if (key.includes(':')) {
				const [parent, child] = key.split(':');
				return tx.category === parent && tx.subcategory === child;
			}
			if (drill.isParentTotal) return tx.category === key;
			if (reportView === 'subcategory') return tx.category === key && !tx.subcategory;
			return tx.category === key;
		};

		const pool = drill.kind === 'income' ? incomeTransactions
			: drill.kind === 'expense' ? expenseTransactions
				// 월 헤더처럼 kind 가 없는 셀은 수입·지출을 함께 보여준다.
				: [...incomeTransactions, ...expenseTransactions];
		return pool
			.filter(tx => tx.date >= drill.startDate && tx.date <= drill.endDate)
			.filter(tx => matchesCategory(tx, drill.category))
			.sort((a, b) => b.date.localeCompare(a.date));
	}, [drill, incomeTransactions, expenseTransactions, reportView]);

	const drillTotal = useMemo(() => {
		const rate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;
		return Math.round(drillTransactions.reduce((sum, tx) => {
			const txCur = accountCurrencyMap[tx.accountId] || 'KRW';
			if (txCur === currency) return sum + tx.amount;
			return sum + (txCur === 'KRW' ? tx.amount / rate : tx.amount * rate);
		}, 0));
	}, [drillTransactions, accountCurrencyMap, currency, exchangeRate]);

	const drillTitle = drill
		? (drill.category || `${moment(drill.startDate).format('YYYY-MM')} 전체`)
		: '';

	const chartData = MONTH_LIST.map((_, index) => ({
		month: moment().month(index).format('MMM'),
		income: totalMonthIncomeSum[index] || 0,
		expense: Math.abs(totalMonthExpenseSum[index] || 0)
	}));

	const onYearChange = event => {
		const val = event.target.value;
		setYear(val);
		const params = new URLSearchParams(location.search);
		params.set('year', val);
		navigate(`?${params.toString()}`, { replace: true });
	};

	const onFilterChange = (newFilters) => {
		setFilters(newFilters);
		const params = new URLSearchParams(location.search);
		if (newFilters.length > 0) {
			params.set('filters', newFilters.join(','));
		} else {
			params.delete('filters');
		}
		navigate(`?${params.toString()}`, { replace: true });
	};

	const filterOptions = [
		{ value: 'category', label: '카테고리별 보기' },
		{ value: 'livingExpenseOnly', label: '생활비만 보기' },
		{ value: 'livingExpenseCardOnly', label: '생활비카드만 보기' },
		{ value: 'boAOnly', label: 'BoA Only' }
	];

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	const yearSelectSx = {
		minWidth: 140,
		'& .MuiOutlinedInput-root': {
			background: T.bg,
			borderRadius: '8px',
			fontSize: 13,
			color: T.ink,
			height: 36
		},
		'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
		'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
		'& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero }
	};

	return (
		<Stack
			spacing={2}
			sx={{
				flex: 1,
				// Concrete viewport-relative height so the inner flex:1 panel actually receives
				// remaining space. Offset accounts for sidebar header gutter + DesignPage title +
				// section pill row + sub-tab row + page padding.
				height: { xs: 'auto', md: 'calc(100vh - 140px)' },
				minHeight: { xs: 720, md: 'calc(100vh - 140px)' },
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			{/* Top controls + chart panel */}
			{/* 좌우 패딩을 패널에서 빼고 내부 행에 준다. 그래야 차트 래퍼의 100% 가
				아래 표와 같은 폭(패널 content width)을 가리켜 정렬 계산이 맞는다. */}
			<Box sx={{ ...panelSx, padding: { xs: '14px 0', md: '18px 0' } }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1, marginBottom: 1.5, paddingX: { xs: '14px', md: '18px' } }}>
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography sx={lab}>Year</Typography>
						<FormControl size="small" sx={yearSelectSx}>
							<Select
								value={year}
								onChange={onYearChange}
								MenuProps={{
									PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } }
								}}
							>
								{
									YEAR_LIST.map(i => (
										<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
									))
								}
							</Select>
						</FormControl>
					</Stack>
					<Stack direction="row" spacing={1} alignItems="center">
						<SortMenuButton
							value={view}
							onChange={setView}
							options={[
								{ value: 'grid', label: 'Grid' },
								{ value: 'sankey', label: 'Sankey' }
							]}
						/>
						<FilterMenu
							filterName="Filters"
							options={filterOptions}
							selectedOptions={filters}
							onSelectionChange={onFilterChange}
						/>
					</Stack>
				</Stack>
				{/* 차트 월 위치를 아래 표의 월 열과 맞춘다.
					왼쪽: 표의 첫 열(Category) 폭만큼 비운다.
					오른쪽: Total 열 폭 = (전체 - 첫 열) / 13 만큼 비운다.
					모바일은 표가 가로 스크롤이라 정렬이 불가능해 일반 패딩을 쓴다. */}
				<Box sx={{
					paddingLeft: { xs: '14px', md: `${FIRST_COL_WIDTH}px` },
					paddingRight: { xs: '14px', md: `calc((100% - ${FIRST_COL_WIDTH}px) / ${VALUE_COLUMN_COUNT})` }
				}}>
					<MonthlyComparisonChart chartData={chartData} />
				</Box>
			</Box>

			{/* Grid / Sankey panel — fills remaining vertical space */}
			<Box sx={{
				...panelSx,
				flex: { xs: '0 0 auto', md: 1 },
				display: 'flex',
				flexDirection: 'column',
				// Mobile takes natural height (Sankey wrapper sets its own px); desktop fills via flex.
				minHeight: { xs: 'auto', md: 0 },
				padding: 0,
				overflow: { xs: 'visible', md: 'hidden' }
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ padding: { xs: '14px 14px 8px', md: '18px 18px 10px' } }}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
						{view === 'grid' ? 'Monthly breakdown' : 'Income & expense flow'}
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}>
							{' · '}{view === 'grid' ? '월별 내역' : '수입·지출 흐름'}
						</Box>
					</Typography>
					{view === 'grid' && reportData.length > 1 && (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>
							{reportData.length - 1} rows
						</Typography>
					)}
				</Stack>
				<Box sx={{
					// Mobile: drop flex so the explicit pixel height wins. With flex:1, the
					// "1 1 0%" shorthand resets flex-basis to 0 and overrides height:600,
					// collapsing the inner area to 0 and hiding the grid.
					flex: { md: 1 },
					minHeight: { md: 0 },
					position: 'relative',
					height: { xs: 600, md: 'auto' }
				}}>
					{view === 'grid' && reportData.length > 1 && (
						<MonthlyExpenseGrid reportData={reportData} onCellClick={setDrill} />
					)}
					{view === 'sankey' && (
						<Box sx={{ height: '100%', minHeight: 480 }}>
							<SankeyChart data={sankeyData} />
						</Box>
					)}
					{view === 'grid' && reportData.length <= 1 && (
						<Box sx={{ padding: 4, textAlign: 'center' }}>
							<Typography sx={{ fontSize: 13, color: T.ink2 }}>No spending data yet</Typography>
						</Box>
					)}
				</Box>
			</Box>

			{/* 셀 드릴다운 — 페이지를 떠나지 않고 내역을 보여준다 (Spending 과 동일) */}
			<TransactionListDialog
				open={!!drill}
				onClose={() => setDrill(null)}
				title={drillTitle}
				iconCategory={drill?.category ? drill.category.split(':')[0] : undefined}
				transactions={drillTransactions}
				accountCurrencyMap={accountCurrencyMap}
				currency={currency}
				total={drillTotal}
			/>
		</Stack>
	);
};

export default MonthlyExpense;
