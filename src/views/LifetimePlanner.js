import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import {
	ResponsiveContainer, ComposedChart, BarChart, Bar, Line, Cell,
	XAxis, YAxis, Tooltip, ReferenceLine
} from 'recharts';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import Layout from '../components/Layout';
import SortMenuButton from '../components/SortMenuButton';
import Amount from '../components/Amount';

import { updateGeneralAction } from '../actions/couchdbSettingActions';
import { getLifetimeFlowAction } from '../actions/couchdbReportActions';
import { toCurrencyFormat } from '../utils/formatting';

const EVENT_COLOR = { year: 'default', income: 'success', expense: 'warning' };

const YearEventLabel = ({ viewBox, value, fill }) => {
	if (!viewBox) return null;
	const { x, y } = viewBox;
	return (
		<g transform={`translate(${x},${y})`}>
			<text
				transform="rotate(-45)"
				x={0}
				y={0}
				dx={4}
				dy={-4}
				fontSize={9}
				fill={fill}
				textAnchor="start"
			>
				{value}
			</text>
		</g>
	);
};

YearEventLabel.propTypes = {
	viewBox: PropTypes.object,
	value: PropTypes.string,
	fill: PropTypes.string
};

const CustomTooltip = ({ active, payload, label, events }) => {
	if (!active || !payload?.length) return null;
	const yearEvents = (events || []).filter(e => e.year === label);
	return (
		<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minWidth: 160, boxShadow: 3 }}>
			<Typography variant="subtitle2" gutterBottom>{label}</Typography>
			{[...payload].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).map(entry => (
				<Stack key={entry.dataKey} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
					<Stack direction="row" spacing={0.5} alignItems="center">
						<Box sx={{ width: 10, height: 10, bgcolor: entry.color, borderRadius: '2px' }} />
						<Typography variant="caption">{entry.name}</Typography>
					</Stack>
					<Typography variant="caption">{toCurrencyFormat(entry.value)}</Typography>
				</Stack>
			))}
			{yearEvents.map((e, i) => (
				<Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
					{e.type === 'income' ? '↑' : e.type === 'expense' ? '↓' : '●'} {e.label}{e.row ? ` (${e.row})` : ''}
				</Typography>
			))}
		</Box>
	);
};

CustomTooltip.propTypes = {
	active: PropTypes.bool,
	events: PropTypes.array,
	label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	payload: PropTypes.array
};

function LifetimePlanner () {
	const theme = useTheme();
	const { data: flowData = [], events = [] } = useSelector((state) => state.lifetimePlannerFlow);
	const { currency: displayCurrency, exchangeRate, lifetimePlannerChartType = 'both' } = useSelector((state) => state.settings);
	const [tableRange, setTableRange] = useState('20y');
	const [showDetail, setShowDetail] = useState(false);
	const dispatch = useDispatch();
	const currentYear = new Date().getFullYear();

	useEffect(() => {
		dispatch(getLifetimeFlowAction());
	}, [dispatch]);

	const flowDataWithCurrency = useMemo(() =>
		flowData.map(item => ({
			...item,
			amount: displayCurrency === 'USD' ? item.amount / exchangeRate : item.amount,
			amountInflation: displayCurrency === 'USD' ? item.amountInflation / exchangeRate : item.amountInflation,
			netFlow: displayCurrency === 'USD' ? (item.netFlow || 0) / exchangeRate : (item.netFlow || 0)
		}))
	, [flowData, displayCurrency, exchangeRate]);

	const yearEvents = useMemo(() => events.filter(e => e.type === 'year'), [events]);
	const incomeEvents = useMemo(() => events.filter(e => e.type === 'income'), [events]);
	const expenseEvents = useMemo(() => events.filter(e => e.type === 'expense'), [events]);

	const tableData = useMemo(() => {
		const eventYears = new Set(events.map(e => e.year));
		return flowDataWithCurrency
			.filter(d => {
				if (tableRange === '20y' && d.year > currentYear + 20) return false;
				return d.year === currentYear || d.year % 5 === 0 || eventYears.has(d.year);
			})
			.map(d => ({ ...d, rowEvents: events.filter(e => e.year === d.year) }));
	}, [flowDataWithCurrency, events, tableRange, currentYear]);

	if (!flowData.length) {
		return <Layout title="Lifetime Planner" loading />;
	}

	const refStroke = {
		year: { stroke: theme.palette.text.disabled, strokeDasharray: '6 3' },
		income: { stroke: theme.palette.success.main, strokeDasharray: '4 4' },
		expense: { stroke: theme.palette.warning.main, strokeDasharray: '4 4' }
	};

	return (
		<Layout title="Lifetime Planner">
			{/* ── Net Worth Chart ── */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5, px: 1 }}>
				<Typography variant="subtitle2">Net Worth</Typography>
				<SortMenuButton
					value={lifetimePlannerChartType}
					onChange={(v) => dispatch(updateGeneralAction('lifetimePlannerChartType', v))}
					options={[
						{ value: 'both', label: 'Both' },
						{ value: 'withInflation', label: 'With Inflation' },
						{ value: 'withoutInflation', label: 'Without Inflation' }
					]}
				/>
			</Stack>
			<Box sx={{ width: '100%', height: 320, '& svg': { overflow: 'visible' } }}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={flowDataWithCurrency} margin={{ top: 80, right: 10, left: 10, bottom: 5 }}>
						<XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
						<YAxis hide />
						<Tooltip content={<CustomTooltip events={events} />} />
						{(lifetimePlannerChartType === 'withInflation' || lifetimePlannerChartType === 'both') &&
							<Bar dataKey="amount" name="With Inflation" fill={theme.palette.success.main} radius={[2, 2, 0, 0]} />
						}
						{lifetimePlannerChartType === 'withoutInflation' &&
							<Bar dataKey="amountInflation" name="Base" fill={theme.palette.primary.main} radius={[2, 2, 0, 0]} />
						}
						{lifetimePlannerChartType === 'both' &&
							<Line dataKey="amountInflation" name="Base" stroke={theme.palette.primary.main} strokeDasharray="5 5" dot={false} />
						}
						{yearEvents.map(e => (
							<ReferenceLine key={`y-${e.year}`} x={e.year} {...refStroke.year}
								label={<YearEventLabel value={e.label} fill={theme.palette.text.secondary} />}
							/>
						))}
						{incomeEvents.map((e, i) => (
							<ReferenceLine key={`i-${i}`} x={e.year} {...refStroke.income} />
						))}
						{expenseEvents.map((e, i) => (
							<ReferenceLine key={`ex-${i}`} x={e.year} {...refStroke.expense} />
						))}
					</ComposedChart>
				</ResponsiveContainer>
			</Box>

			{/* ── Cash Flow Chart ── */}
			<Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5, px: 1 }}>Cash Flow</Typography>
			<Box sx={{ width: '100%', height: 240 }}>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={flowDataWithCurrency} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
						<XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
						<YAxis hide />
						<Tooltip content={<CustomTooltip events={events} />} />
						<ReferenceLine y={0} stroke={theme.palette.divider} />
						<Bar dataKey="netFlow" name="Cash Flow" radius={[2, 2, 0, 0]}>
							{flowDataWithCurrency.map((entry, index) => (
								<Cell key={index} fill={entry.netFlow >= 0 ? theme.palette.success.main : theme.palette.error.main} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</Box>

			{/* ── Year Detail Table ── */}
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				onClick={() => setShowDetail(v => !v)}
				sx={{ mt: 2, px: 1, cursor: 'pointer' }}
			>
				<Typography variant="subtitle2">Year Detail</Typography>
				<Stack direction="row" alignItems="center" spacing={0.5}>
					{showDetail && (
						<ToggleButtonGroup
							value={tableRange}
							exclusive
							onChange={(_, v) => { v && setTableRange(v); }}
							size="small"
							onClick={e => e.stopPropagation()}
						>
							<ToggleButton value="20y" sx={{ fontSize: 10, py: 0.25, px: 1 }}>20Y</ToggleButton>
							<ToggleButton value="all" sx={{ fontSize: 10, py: 0.25, px: 1 }}>All</ToggleButton>
						</ToggleButtonGroup>
					)}
					<IconButton size="small" sx={{ transform: showDetail ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
						<ExpandMoreIcon fontSize="small" />
					</IconButton>
				</Stack>
			</Stack>
			<Collapse in={showDetail}>
				<Box sx={{ overflowX: 'auto', mt: 0.5 }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Year</TableCell>
								<TableCell align="right">Net Worth</TableCell>
								<TableCell align="right">Cash Flow</TableCell>
								<TableCell>Events</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{tableData.map(row => (
								<TableRow
									key={row.year}
									sx={{
										bgcolor: row.rowEvents.length > 0 ? 'action.hover' : 'inherit',
										...(row.netFlow < 0 && { '& td': { color: 'error.main' } })
									}}
								>
									<TableCell>{row.year}</TableCell>
									<TableCell align="right">
										<Amount value={Math.round(row.amount)} currency={displayCurrency} />
									</TableCell>
									<TableCell align="right">
										<Amount value={Math.round(row.netFlow)} currency={displayCurrency} />
									</TableCell>
									<TableCell>
										<Stack direction="row" flexWrap="wrap" gap={0.5}>
											{row.rowEvents.map((e, i) => (
												<Chip
													key={i}
													size="small"
													color={EVENT_COLOR[e.type]}
													label={e.label + (e.row ? ` (${e.row})` : '')}
													sx={{ fontSize: 10, height: 20 }}
												/>
											))}
										</Stack>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			</Collapse>
		</Layout>
	);
}

export default LifetimePlanner;
