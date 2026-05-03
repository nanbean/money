import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import stringToColor from 'string-to-color';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import SortMenuButton from '../../components/SortMenuButton';
import { updateGeneralAction } from '../../actions/couchdbSettingActions';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency, fmtCurrencyFull, fmtPrice, fmtQty } from '../../utils/designTokens';

const linkStyle = { textDecoration: 'none', color: 'inherit', display: 'block' };

const getInvestmentsFromAccounts = (accounts) => {
	if (!accounts) return [];

	const accountInvestments = accounts.flatMap(account =>
		(account.investments || []).map(investment => ({
			name: investment.name,
			currency: account.currency,
			quantity: investment.quantity,
			purchasedValue: investment.purchasedValue,
			appraisedValue: investment.appraisedValue,
			profit: investment.appraisedValue - investment.purchasedValue
		}))
	);

	const aggregatedData = accountInvestments.reduce((acc, { name, currency, quantity, purchasedValue, appraisedValue, profit }) => {
		if (!acc[name]) {
			acc[name] = { name, currency, quantity: 0, purchasedValue: 0, appraisedValue: 0, profit: 0 };
		}
		acc[name].quantity += quantity;
		acc[name].purchasedValue += purchasedValue;
		acc[name].appraisedValue += appraisedValue;
		acc[name].profit += profit;
		return acc;
	}, {});

	return Object.values(aggregatedData).map(i => ({
		name: i.name,
		currency: i.currency,
		quantity: i.quantity,
		purchasedValue: i.purchasedValue,
		appraisedValue: i.appraisedValue,
		profit: i.profit,
		return: i.purchasedValue !== 0 ? i.profit / i.purchasedValue : 0
	})).filter(({ quantity }) => quantity > 0);
};

export function StockList () {
	const T = useT();

	const accountList = useSelector((state) => state.accountList);
	const allInvestments = useSelector((state) => state.allInvestments);
	const { exchangeRate, currency = 'KRW', stockListSortBy: sortBy = 'equity' } = useSelector((state) => state.settings);
	const dispatch = useDispatch();

	const rawStockList = useMemo(() => getInvestmentsFromAccounts(accountList), [accountList]);

	const handleSortChange = (newSortBy) => {
		dispatch(updateGeneralAction('stockListSortBy', newSortBy));
	};

	const stockList = useMemo(() => {
		const list = [...rawStockList];
		const convertToKRW = (item, key) => {
			const value = item[key];
			return item.currency === 'USD' ? value * exchangeRate : value;
		};
		switch (sortBy) {
		case 'quantity':
			return list.sort((a, b) => b.quantity - a.quantity);
		case 'return':
			return list.sort((a, b) => b.return - a.return);
		case 'equity':
		case 'allocation':
		default:
			return list.sort((a, b) => convertToKRW(b, 'appraisedValue') - convertToKRW(a, 'appraisedValue'));
		}
	}, [rawStockList, sortBy, exchangeRate]);

	const { totalProfit, totalPurchasedValue, totalAppraisedValue } = stockList.reduce((totals, inv) => {
		const fx = inv.currency === 'USD' ? exchangeRate : 1;
		totals.totalProfit += inv.profit * fx;
		totals.totalPurchasedValue += inv.purchasedValue * fx;
		totals.totalAppraisedValue += inv.appraisedValue * fx;
		return totals;
	}, { totalProfit: 0, totalPurchasedValue: 0, totalAppraisedValue: 0 });
	const totalReturn = totalPurchasedValue !== 0 ? (totalProfit / totalPurchasedValue * 100) : 0;

	const headerSummaryColor = totalProfit >= 0 ? T.pos : T.neg;

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '16px', md: '20px' },
			color: T.ink
		}}>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ marginBottom: 1.5 }}>
				<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>
					Stock list
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 보유 종목</Box>
				</Typography>
				<SortMenuButton
					value={sortBy}
					onChange={handleSortChange}
					options={[
						{ value: 'equity', label: 'Equity' },
						{ value: 'quantity', label: 'Quantity' },
						{ value: 'allocation', label: 'Allocation' },
						{ value: 'return', label: 'Return' }
					]}
				/>
			</Stack>

			{stockList.length === 0 && (
				<Box sx={{ padding: 3, textAlign: 'center' }}>
					<Typography sx={{ fontSize: 13, color: T.ink2 }}>No holdings</Typography>
				</Box>
			)}

			{stockList.map((i, idx) => {
				const investment = allInvestments.find(j => j.name === i.name);
				const rate = investment?.rate;
				const profitColor = i.profit >= 0 ? T.pos : T.neg;
				const rateColor = rate > 0 ? T.pos : rate < 0 ? T.neg : T.ink2;

				return (
					<Link key={i.name} to={`/performance/${i.name}`} style={linkStyle}>
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: '1fr auto',
							gap: 1.5,
							alignItems: 'center',
							padding: '10px 4px',
							borderTop: idx === 0 ? 'none' : `1px solid ${T.rule}`,
							cursor: 'pointer',
							transition: 'background 0.12s',
							'&:hover': { background: T.surf2 }
						}}>
							<Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
								<Box sx={{
									width: 8,
									height: 8,
									borderRadius: '2px',
									background: stringToColor(i.name),
									flexShrink: 0
								}}/>
								<Box sx={{ minWidth: 0 }}>
									<Typography sx={{
										fontSize: 13,
										fontWeight: 600,
										color: T.ink,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}}>
										{i.name}
									</Typography>
									<Stack direction="row" alignItems="center" spacing={0.75} sx={{ marginTop: '2px', flexWrap: 'wrap', rowGap: 0.25 }}>
										<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2, whiteSpace: 'nowrap' }}>
											{fmtQty(i.quantity)} × {fmtPrice(investment?.price, i.currency)}
										</Typography>
										{typeof rate === 'number' && (
											<Typography sx={{ ...sMono, fontSize: 11, color: rateColor, whiteSpace: 'nowrap' }}>
												({rate > 0 ? '+' : ''}{rate}%)
											</Typography>
										)}
									</Stack>
								</Box>
							</Stack>
							<Stack alignItems="flex-end" sx={{ minWidth: 0 }}>
								<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap' }}>
									{fmtCurrencyFull(i.appraisedValue, i.currency)}
								</Typography>
								<Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ marginTop: '2px' }}>
									<Typography sx={{ ...sMono, fontSize: 11, fontWeight: 600, color: profitColor, whiteSpace: 'nowrap' }}>
										{i.profit >= 0 ? '+' : '−'}{fmtCurrencyFull(Math.abs(i.profit), i.currency)}
									</Typography>
									<Typography sx={{ ...sMono, fontSize: 11, color: profitColor, whiteSpace: 'nowrap' }}>
										({(i.return * 100).toFixed(2)}%)
									</Typography>
								</Stack>
							</Stack>
						</Box>
					</Link>
				);
			})}

			{stockList.length > 0 && (
				<Box sx={{
					marginTop: 1.25,
					paddingTop: 1.25,
					borderTop: `1px solid ${T.rule}`,
					display: 'grid',
					gridTemplateColumns: '1fr auto',
					gap: 1.5,
					alignItems: 'center'
				}}>
					<Typography sx={{ fontSize: 11, fontWeight: 600, color: T.ink2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
						Subtotal
					</Typography>
					<Stack alignItems="flex-end">
						<Typography sx={{ ...sMono, fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap' }}>
							{fmtCurrency(totalAppraisedValue, currency)}
						</Typography>
						<Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ marginTop: '2px' }}>
							<Typography sx={{ ...sMono, fontSize: 11, fontWeight: 600, color: headerSummaryColor, whiteSpace: 'nowrap' }}>
								{totalProfit >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(totalProfit), currency)}
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 11, color: headerSummaryColor, whiteSpace: 'nowrap' }}>
								({totalReturn.toFixed(2)}%)
							</Typography>
						</Stack>
					</Stack>
				</Box>
			)}
		</Box>
	);
}

export default StockList;
