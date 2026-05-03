import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import ReactEcharts from 'echarts-for-react';

import stc from 'string-to-color';

import AccountFilter from '../../components/AccountFilter';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../../utils/designTokens';

function InvestmentPortfolio () {
	const T = useT();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('md'));

	const accountList = useSelector((state) => state.accountList);
	const allAccounts = accountList.filter(i => i.type === 'Invst' && !i.closed).map(j => j.name);
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);

	const allInvestments = useMemo(() => accountList.filter(i => filteredAccounts.find(j => j === i.name)).reduce((acc, item) => {
		const investments = item.investments;
		const accountOriginalCurrency = item.currency || 'KRW';
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;
		investments.forEach(investment => {
			let convertedAmount = investment.quantity * investment.price;

			if (displayCurrency && accountOriginalCurrency && accountOriginalCurrency !== displayCurrency) {
				if (displayCurrency === 'KRW') {
					if (accountOriginalCurrency === 'USD') {
						convertedAmount *= validExchangeRate;
					}
				} else if (displayCurrency === 'USD') {
					if (accountOriginalCurrency === 'KRW') {
						convertedAmount /= validExchangeRate;
					}
				}
			}

			var existingInvestment = acc.find(el => el.name === investment.name);

			if (existingInvestment) {
				existingInvestment.quantity += investment.quantity;
				existingInvestment.amount += convertedAmount;
				existingInvestment.children.push({
					account: item.name,
					name: investment.name,
					quantity: investment.quantity,
					price: investment.price,
					amount: convertedAmount
				});
			} else {
				acc.push({
					name: investment.name,
					quantity: investment.quantity,
					price: investment.price,
					amount: convertedAmount,
					children: [{
						account: item.name,
						name: investment.name,
						quantity: investment.quantity,
						price: investment.price,
						amount: convertedAmount
					}]
				});
			}
		});
		return acc;
	}, []).filter(item => item.quantity > 0).sort((a, b) => b.amount - a.amount), [accountList, filteredAccounts, displayCurrency, exchangeRate]);

	const color = useMemo(() => allInvestments.map(i => stc(i.name)), [allInvestments]);
	const totalAmount = useMemo(() => allInvestments.reduce((acc, item) => acc + item.amount, 0), [allInvestments]);

	const onFilteredAccountsChange = (e) => setFilteredAccounts(e);

	const labelColor = T.dark ? '#fff' : '#0f172a';
	const upperLabelColor = T.dark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)';

	const option = {
		backgroundColor: 'transparent',
		tooltip: {
			trigger: 'item',
			backgroundColor: T.surf,
			borderColor: T.rule,
			borderWidth: 1,
			textStyle: { color: T.ink, fontSize: 12 },
			formatter: d => `${d.name}<br/>${fmtCurrency(d.value, displayCurrency)} · ${(d.value / totalAmount * 100).toFixed(2)}%`
		},
		series: [{
			name: 'Portfolio',
			type: 'treemap',
			width: '100%',
			height: '100%',
			roam: false,
			breadcrumb: { show: false },
			label: {
				show: true,
				color: labelColor,
				fontSize: isMobile ? 10 : 12,
				fontWeight: 600,
				formatter: d => `${d.name}\n${(d.value / totalAmount * 100).toFixed(2)}%`
			},
			data: allInvestments.map(i => ({
				name: i.name,
				value: i.amount,
				children: i.children.map(j => ({ name: j.account, value: j.amount }))
			})),
			levels: [
				{
					itemStyle: { gapWidth: 2, borderColor: T.rule, borderWidth: 1 },
					upperLabel: { show: false },
					color,
					colorMappingBy: 'id'
				},
				{
					itemStyle: { gapWidth: 1, borderColor: T.rule, borderWidth: 1 },
					upperLabel: {
						show: true,
						height: 26,
						color: upperLabelColor,
						fontSize: 11,
						fontWeight: 600
					}
				}
			]
		}]
	};

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	return (
		<Stack spacing={2}>
			{/* Header panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
					<Box>
						<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
							Portfolio
							<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 포트폴리오 구성</Box>
						</Typography>
						{totalAmount > 0 && (
							<Typography sx={{ ...sMono, fontSize: 13, color: T.ink2, marginTop: '4px' }}>
								Total: {fmtCurrency(totalAmount, displayCurrency)} · {allInvestments.length} positions
							</Typography>
						)}
					</Box>
					<AccountFilter
						allAccounts={allAccounts}
						filteredAccounts={filteredAccounts}
						setfilteredAccounts={onFilteredAccountsChange}
					/>
				</Stack>
			</Box>

			{/* Treemap panel */}
			<Box sx={panelSx}>
				{allInvestments.length > 0 ? (
					<Box sx={{ height: { xs: 420, md: 600 } }}>
						<ReactEcharts
							option={option}
							style={{ height: '100%', width: '100%' }}
							opts={{ renderer: 'canvas' }}
							notMerge
						/>
					</Box>
				) : (
					<Box sx={{ padding: 6, textAlign: 'center' }}>
						<Typography sx={{ fontSize: 13, color: T.ink2 }}>No holdings to display</Typography>
					</Box>
				)}
			</Box>
		</Stack>
	);
}

export default InvestmentPortfolio;
