import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import { AutoSizer, List } from 'react-virtualized';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import useWidth from '../../hooks/useWidth';
import { sMono, fmtCurrencyFull, fmtPrice, fmtQty } from '../../utils/designTokens';

import { toDateFormat } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import 'react-virtualized/styles.css';

const tint = (hex, alphaHex = '22') => `${hex}${alphaHex}`;

// Per-activity colors and which fields they use (mirrors design INV_ACTIVITIES intent)
const buildActivityMeta = (T) => ({
	Buy:     { label: 'Buy',      color: T.pos,        showQty: true,  showPrice: true,  showCommission: true },
	Sell:    { label: 'Sell',     color: T.neg,        showQty: true,  showPrice: true,  showCommission: true },
	Div:     { label: 'Dividend', color: T.acc.hero,   showQty: false, showPrice: false, showCommission: false },
	ShrsIn:  { label: 'Shares in', color: T.acc.bright, showQty: true,  showPrice: false, showCommission: false },
	ShrsOut: { label: 'Shares out', color: T.ink2,     showQty: true,  showPrice: false, showCommission: false },
	MiscExp: { label: 'Misc.',    color: T.ink2,       showQty: false, showPrice: false, showCommission: false }
});

const ROW_HEIGHT = 44;

// Two responsive grid templates — the small one for narrow viewports
// hides Date / Qty / Price / Commission and shows Security · Activity · Amount.
const GRID_FULL = '88px 1fr 110px 80px 100px 90px 130px';
const GRID_SMALL = '1fr 100px 110px';

const COL_HEADERS = [
	{ key: 'date',       label: 'Date',       align: 'left' },
	{ key: 'security',   label: 'Security',   align: 'left' },
	{ key: 'activity',   label: 'Activity',   align: 'left' },
	{ key: 'qty',        label: 'Qty',        align: 'right' },
	{ key: 'price',      label: 'Price',      align: 'right' },
	{ key: 'commission', label: 'Comm.',      align: 'right' },
	{ key: 'amount',     label: 'Amount',     align: 'right' }
];

const COL_HEADERS_SMALL = [
	{ key: 'security', label: 'Security', align: 'left' },
	{ key: 'activity', label: 'Activity', align: 'left' },
	{ key: 'amount',   label: 'Amount',   align: 'right' }
];

export function InvestmentTransactions ({
	currency,
	transactions
}) {
	const T = useT();
	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';

	const dispatch = useDispatch();
	const meta = useMemo(() => buildActivityMeta(T), [T]);

	const onRowSelect = (index) => () => {
		const t = transactions[index];
		if (!t) return;
		dispatch(openTransactionInModal({
			date: t.date,
			investment: t.investment,
			activity: t.activity,
			quantity: t.quantity,
			price: t.price,
			commission: t.commission ? t.commission : '',
			amount: t.amount,
			isEdit: true,
			index: index
		}));
	};

	const headerSx = {
		display: 'grid',
		gridTemplateColumns: isSmallScreen ? GRID_SMALL : GRID_FULL,
		gap: '10px',
		padding: '10px 14px',
		background: T.dark ? '#15151c' : '#f5f5fa',
		fontSize: 11,
		color: T.ink2,
		fontWeight: 600,
		textTransform: 'uppercase',
		letterSpacing: '0.06em',
		borderTopLeftRadius: '12px',
		borderTopRightRadius: '12px',
		borderBottom: `1px solid ${T.rule}`
	};

	const cellMonoSx = {
		...sMono,
		fontSize: 13,
		color: T.ink,
		textAlign: 'right'
	};

	const headers = isSmallScreen ? COL_HEADERS_SMALL : COL_HEADERS;

	const rowRenderer = ({ key, index, style }) => {
		const t = transactions[index];
		if (!t) return null;

		const m = meta[t.activity] || { label: t.activity || '—', color: T.ink2, showQty: true, showPrice: true, showCommission: true };
		const amount = Number(t.amount) || 0;
		const amountColor = amount > 0 ? T.pos : amount < 0 ? T.ink : T.ink3;

		const activityChip = (
			<Box sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 0.5,
				padding: '3px 8px',
				borderRadius: '999px',
				background: tint(m.color, '22'),
				color: m.color,
				fontSize: 11,
				fontWeight: 600,
				justifySelf: 'start'
			}}>
				<Box sx={{ width: 5, height: 5, borderRadius: '3px', background: m.color, flexShrink: 0 }} />
				{m.label}
			</Box>
		);

		const security = (
			<Typography sx={{
				fontSize: 13,
				fontWeight: 600,
				color: T.ink,
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			}}>
				{t.investment || '—'}
			</Typography>
		);

		const amountCell = (
			<Typography sx={{
				...sMono,
				fontSize: 13,
				fontWeight: 700,
				color: amount === 0 ? T.ink3 : amountColor,
				textAlign: 'right',
				whiteSpace: 'nowrap'
			}}>
				{amount === 0 ? '—' : (
					<>
						{amount > 0 ? '+' : '−'}
						{fmtCurrencyFull(Math.abs(amount), currency)}
					</>
				)}
			</Typography>
		);

		if (isSmallScreen) {
			return (
				<Box
					key={key}
					style={style}
					onClick={onRowSelect(index)}
					sx={{
						display: 'grid',
						gridTemplateColumns: GRID_SMALL,
						gap: '10px',
						padding: '10px 14px',
						alignItems: 'center',
						background: T.surf,
						borderTop: `1px solid ${T.rule}`,
						cursor: 'pointer',
						'&:hover': { background: T.surf2 }
					}}
				>
					{security}
					{activityChip}
					{amountCell}
				</Box>
			);
		}

		const dash = <Box component="span" sx={{ color: T.ink3 }}>—</Box>;
		return (
			<Box
				key={key}
				style={style}
				onClick={onRowSelect(index)}
				sx={{
					display: 'grid',
					gridTemplateColumns: GRID_FULL,
					gap: '10px',
					padding: '10px 14px',
					alignItems: 'center',
					background: T.surf,
					borderTop: `1px solid ${T.rule}`,
					cursor: 'pointer',
					'&:hover': { background: T.surf2 }
				}}
			>
				<Box sx={{ ...sMono, fontSize: 12, color: T.ink2, whiteSpace: 'nowrap' }}>
					{toDateFormat(t.date)}
				</Box>
				{security}
				{activityChip}
				<Box sx={cellMonoSx}>
					{m.showQty && t.quantity ? fmtQty(t.quantity) : dash}
				</Box>
				<Box sx={{ ...cellMonoSx, color: T.ink2 }}>
					{m.showPrice && t.price ? fmtPrice(t.price, currency) : dash}
				</Box>
				<Box sx={{ ...cellMonoSx, color: T.ink2 }}>
					{m.showCommission && t.commission ? fmtPrice(t.commission, currency) : dash}
				</Box>
				{amountCell}
			</Box>
		);
	};

	if (!transactions || transactions.length === 0) {
		return (
			<Box sx={{ padding: '40px 0', textAlign: 'center', color: T.ink2 }}>
				<Typography sx={{ fontSize: 13 }}>No transactions yet</Typography>
				<Typography sx={{ fontSize: 12, color: T.ink3, marginTop: 0.5 }}>
					매수, 매도, 배당 등을 기록하세요.
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{
			display: 'flex',
			flexDirection: 'column',
			minHeight: { xs: 480, md: 600 },
			height: '100%',
			border: `1px solid ${T.rule}`,
			borderRadius: '12px',
			overflow: 'hidden'
		}}>
			{/* Sticky header */}
			<Box sx={{ ...headerSx, flexShrink: 0 }}>
				{headers.map(h => (
					<Box key={h.key} sx={{ textAlign: h.align }}>{h.label}</Box>
				))}
			</Box>

			{/* Virtualized rows — flex:1 + explicit minHeight so AutoSizer always has a non-zero parent. */}
			<Box sx={{ flex: 1, minHeight: 400, position: 'relative' }}>
				<AutoSizer>
					{({ height, width: aw }) => (
						<List
							width={aw}
							height={height}
							rowHeight={ROW_HEIGHT}
							scrollToIndex={transactions.length - 1}
							rowCount={transactions.length}
							rowRenderer={rowRenderer}
							overscanRowCount={6}
						/>
					)}
				</AutoSizer>
			</Box>
		</Box>
	);
}

InvestmentTransactions.propTypes = {
	currency: PropTypes.string,
	transactions: PropTypes.array
};

export default InvestmentTransactions;
