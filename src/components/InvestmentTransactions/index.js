import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import { useVirtualizer } from '@tanstack/react-virtual';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import useWidth from '../../hooks/useWidth';
import { sMono, fmtCurrencyFull, fmtPrice, fmtQty } from '../../utils/designTokens';

import { toDateFormat } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

const tint = (hex, alphaHex = '22') => `${hex}${alphaHex}`;

const buildActivityMeta = (T) => ({
	Buy:     { label: 'Buy',      color: T.pos,        showQty: true,  showPrice: true,  showCommission: true },
	Sell:    { label: 'Sell',     color: T.neg,        showQty: true,  showPrice: true,  showCommission: true },
	Div:     { label: 'Dividend', color: T.acc.hero,   showQty: false, showPrice: false, showCommission: false },
	ShrsIn:  { label: 'Shares in', color: T.acc.bright, showQty: true,  showPrice: false, showCommission: false },
	ShrsOut: { label: 'Shares out', color: T.ink2,     showQty: true,  showPrice: false, showCommission: false },
	MiscExp: { label: 'Misc.',    color: T.ink2,       showQty: false, showPrice: false, showCommission: false }
});

const ROW_HEIGHT = 44;
const OVERSCAN = 6;

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

	const scrollRef = useRef(null);
	const count = transactions ? transactions.length : 0;

	const rowVirtualizer = useVirtualizer({
		count,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: OVERSCAN,
		getItemKey: (index) => transactions[index]?._id || index
	});

	// Auto-scroll to the latest row on mount / when transactions list grows.
	useEffect(() => {
		if (count === 0) return;
		rowVirtualizer.scrollToIndex(count - 1, { align: 'end' });
	}, [count, rowVirtualizer]);

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
		borderBottom: `1px solid ${T.rule}`,
		position: 'sticky',
		top: 0,
		zIndex: 1
	};

	const cellMonoSx = {
		...sMono,
		fontSize: 13,
		color: T.ink,
		textAlign: 'right'
	};

	const headers = isSmallScreen ? COL_HEADERS_SMALL : COL_HEADERS;

	if (count === 0) {
		return (
			<Box sx={{ padding: '40px 0', textAlign: 'center', color: T.ink2 }}>
				<Typography sx={{ fontSize: 13 }}>No transactions yet</Typography>
				<Typography sx={{ fontSize: 12, color: T.ink3, marginTop: 0.5 }}>
					매수, 매도, 배당 등을 기록하세요.
				</Typography>
			</Box>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	const renderRow = (vRow) => {
		const index = vRow.index;
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

		const commonRowSx = {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			transform: `translateY(${vRow.start}px)`,
			height: ROW_HEIGHT,
			boxSizing: 'border-box',
			display: 'grid',
			gap: '10px',
			padding: '10px 14px',
			alignItems: 'center',
			background: T.surf,
			borderTop: `1px solid ${T.rule}`,
			cursor: 'pointer',
			'&:hover': { background: T.surf2 }
		};

		if (isSmallScreen) {
			return (
				<Box
					key={vRow.key}
					onClick={onRowSelect(index)}
					sx={{ ...commonRowSx, gridTemplateColumns: GRID_SMALL }}
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
				key={vRow.key}
				onClick={onRowSelect(index)}
				sx={{ ...commonRowSx, gridTemplateColumns: GRID_FULL }}
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

	return (
		<Box sx={{
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			border: `1px solid ${T.rule}`,
			borderRadius: '12px',
			overflow: 'hidden'
		}}>
			<Box
				ref={scrollRef}
				sx={{
					flex: 1,
					minHeight: 0,
					minWidth: 0,
					overflow: 'auto',
					WebkitOverflowScrolling: 'touch',
					overscrollBehavior: 'contain',
					scrollbarWidth: 'thin',
					scrollbarColor: 'rgba(128, 128, 128, 0.3) transparent',
					'&::-webkit-scrollbar': { width: 8, height: 8 },
					'&::-webkit-scrollbar-track': { background: 'transparent' },
					'&::-webkit-scrollbar-thumb': {
						background: 'rgba(128, 128, 128, 0.28)',
						borderRadius: '4px',
						border: '2px solid transparent',
						backgroundClip: 'content-box'
					},
					'&::-webkit-scrollbar-thumb:hover': {
						background: 'rgba(128, 128, 128, 0.55)',
						backgroundClip: 'content-box'
					}
				}}
			>
				{/* Sticky header — pinned to top while body scrolls under it */}
				<Box sx={headerSx}>
					{headers.map(h => (
						<Box key={h.key} sx={{ textAlign: h.align }}>{h.label}</Box>
					))}
				</Box>

				{/* Virtualized body */}
				<Box sx={{ height: totalSize, position: 'relative', width: '100%' }}>
					{virtualItems.map(renderRow)}
				</Box>
			</Box>
		</Box>
	);
}

InvestmentTransactions.propTypes = {
	currency: PropTypes.string,
	transactions: PropTypes.array
};

export default InvestmentTransactions;
