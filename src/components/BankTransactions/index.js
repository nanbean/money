import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { useVirtualizer } from '@tanstack/react-virtual';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import useWidth from '../../hooks/useWidth';
import { sMono, fmtCurrencyFull } from '../../utils/designTokens';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { resolveCategoryColor } from '../../utils/categoryColor';

import { toDateFormat } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import { TYPE_ICON_MAP } from '../../constants';

const tint = (hex, alphaHex = '22') => `${hex}${alphaHex}`;

const ROW_HEIGHT_DESKTOP = 64;
const ROW_HEIGHT_MOBILE = 72;
const OVERSCAN = 6;

export function BankTransactions ({
	account,
	currency,
	showAccount,
	transactions
}) {
	const T = useT();

	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';

	const dispatch = useDispatch();
	const accountList = useSelector(state => state.accountList);
	const { categoryIcons = {}, categoryColors = {} } = useSelector(state => state.settings || {});

	const accountById = useMemo(() => {
		const map = new Map();
		(accountList || []).forEach(a => map.set(a._id, a));
		return map;
	}, [accountList]);

	const rowHeight = isSmallScreen ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP;
	const scrollRef = useRef(null);
	const count = transactions ? transactions.length : 0;

	const rowVirtualizer = useVirtualizer({
		count,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: OVERSCAN,
		// stable key so React doesn't reuse rows across re-orders
		getItemKey: (index) => transactions[index]?._id || index
	});

	// Auto-scroll to the latest row on mount / when transactions list grows.
	useEffect(() => {
		if (count === 0) return;
		rowVirtualizer.scrollToIndex(count - 1, { align: 'end' });
	}, [count, rowVirtualizer]);

	const onRowSelect = (index) => () => {
		const transaction = transactions[index];
		if (!transaction) return;

		dispatch(openTransactionInModal({
			account: transaction.account || account,
			date: transaction.date,
			payee: transaction.payee,
			category: transaction.category + (transaction.subcategory ? `:${transaction.subcategory}` : ''),
			amount: transaction.amount,
			memo: transaction.memo,
			isEdit: true,
			index: index
		}));
	};

	if (count === 0) {
		return (
			<Box sx={{ padding: '40px 0', textAlign: 'center', color: T.ink2 }}>
				<Typography sx={{ fontSize: 13 }}>No transactions</Typography>
			</Box>
		);
	}

	const virtualItems = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	return (
		<Box
			ref={scrollRef}
			sx={{
				width: '100%',
				height: '100%',
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
			<Box sx={{ height: totalSize, position: 'relative', width: '100%' }}>
				{virtualItems.map(vRow => {
					const index = vRow.index;
					const t = transactions[index];
					if (!t) return null;

					const baseCat = (t.category || '').split(':')[0] || t.category || '';
					const fullCat = t.category + (t.subcategory ? `:${t.subcategory}` : '');
					const Icon = resolveCategoryIcon(fullCat, categoryIcons[baseCat]);
					const catColor = resolveCategoryColor(fullCat, categoryColors[baseCat]);

					const amount = Number(t.amount) || 0;
					const amountColor = amount > 0 ? T.pos : T.ink;

					let rowCurrency = currency;
					if (!rowCurrency && t.accountId) {
						const acc = accountById.get(t.accountId);
						if (acc?.currency) rowCurrency = acc.currency;
					}
					rowCurrency = rowCurrency || 'KRW';

					const AccountIcon = TYPE_ICON_MAP[t.type];

					return (
						<Box
							key={vRow.key}
							onClick={onRowSelect(index)}
							sx={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								transform: `translateY(${vRow.start}px)`,
								height: rowHeight,
								display: 'grid',
								gridTemplateColumns: '40px 1fr auto',
								gap: 1.5,
								alignItems: 'center',
								padding: '10px 4px',
								boxSizing: 'border-box',
								borderTop: `1px solid ${T.rule}`,
								cursor: 'pointer',
								transition: 'background 0.12s',
								'&:hover': { background: T.surf2 }
							}}
						>
							{/* Category icon box */}
							<Box sx={{
								width: 40,
								height: 40,
								borderRadius: '12px',
								background: tint(catColor, '22'),
								color: catColor,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0
							}}>
								<Icon sx={{ fontSize: 18 }} />
							</Box>

							{/* Payee + meta */}
							<Box sx={{ minWidth: 0 }}>
								<Typography sx={{
									fontSize: 13,
									fontWeight: 600,
									color: T.ink,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{t.payee || baseCat || '—'}
								</Typography>
								<Stack direction="row" alignItems="center" spacing={0.75} sx={{ marginTop: '2px', minWidth: 0 }}>
									<Typography sx={{ fontSize: 11, color: T.ink2, whiteSpace: 'nowrap' }}>
										{toDateFormat(t.date)}
									</Typography>
									{baseCat && (
										<>
											<Box sx={{ width: 3, height: 3, borderRadius: '2px', background: T.ink3, flexShrink: 0 }} />
											<Box sx={{
												display: 'inline-flex',
												alignItems: 'center',
												gap: 0.5,
												padding: '2px 8px',
												borderRadius: '999px',
												background: tint(catColor, '22'),
												color: catColor,
												fontSize: 10,
												fontWeight: 600,
												flexShrink: 1,
												minWidth: 0,
												overflow: 'hidden'
											}}>
												<Box sx={{ width: 5, height: 5, borderRadius: '3px', background: catColor, flexShrink: 0 }} />
												<Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
													{baseCat}
												</Box>
											</Box>
										</>
									)}
									{showAccount && t.account && (
										<>
											<Box sx={{ width: 3, height: 3, borderRadius: '2px', background: T.ink3, flexShrink: 0 }} />
											<Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
												{AccountIcon && <AccountIcon sx={{ fontSize: 11, color: T.ink2 }} />}
												<Typography sx={{ fontSize: 11, color: T.ink2, whiteSpace: 'nowrap' }}>
													{t.account}
												</Typography>
											</Stack>
										</>
									)}
								</Stack>
							</Box>

							{/* Amount */}
							<Typography sx={{
								...sMono,
								fontSize: 14,
								fontWeight: 600,
								color: amountColor,
								whiteSpace: 'nowrap',
								textAlign: 'right'
							}}>
								{amount > 0 ? '+' : amount < 0 ? '−' : ''}
								{fmtCurrencyFull(Math.abs(amount), rowCurrency)}
							</Typography>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}

BankTransactions.propTypes = {
	account: PropTypes.string,
	currency: PropTypes.string,
	showAccount: PropTypes.bool,
	transactions: PropTypes.array
};

export default BankTransactions;
