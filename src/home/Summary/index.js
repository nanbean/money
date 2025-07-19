import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import Amount from '../../components/Amount';
import { toCurrencyFormat } from '../../utils/formatting';

const quickAssetAccount = [
	'동양종금장마',
	'연금저축',
	'오은미연금저축',
	'IRP',
	'IRP오은미'
];

const getSum = (accounts, exchangeRate) => accounts.map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((sum, i) => sum + i, 0);
const getFinanceSum = (accounts, exchangeRate) => accounts.filter(i => i.type !== 'Oth A').map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((sum, i) => sum + i, 0);
const getQuickAssetsSum = (accounts, exchangeRate) => accounts.filter(i => quickAssetAccount.find(j => j === i.name)).map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((sum, i) => sum + i, 0);

export function Summary () {
	const accountList = useSelector((state) => state.accountList);
	const { exchangeRate } = useSelector((state) => state.settings);
	const theme = useTheme();
	const summaryAccountList = useMemo(() => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i)), [accountList]);
	const sum = useMemo(() => getSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);
	const financeSum = useMemo(() => getFinanceSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);
	const quickAssetsSum = useMemo(() => getQuickAssetsSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);

	const chartData = useMemo(() => {
		const retirementAssets = quickAssetsSum;		
		// Calculate sum of investment accounts that are NOT retirement accounts
		const nonRetirementInvestmentAccounts = summaryAccountList.filter(
			i => i.type === 'Invst' && !quickAssetAccount.includes(i.name)
		);
		const investmentAssets = nonRetirementInvestmentAccounts
			.map(i => (i.currency === 'USD' ? i.balance * exchangeRate : i.balance))
			.reduce((sum, i) => sum + i, 0);

		const otherFinancialAssets = financeSum - retirementAssets - investmentAssets;
		const otherAssets = sum - financeSum;

		return [
			{ name: 'Retirement Assets', value: retirementAssets },
			{ name: 'Investment Assets', value: investmentAssets },
			{ name: 'Other Financial Assets', value: otherFinancialAssets },
			{ name: 'Other Assets', value: otherAssets }
		].filter(d => d.value > 0);
	}, [sum, financeSum, quickAssetsSum, summaryAccountList, exchangeRate]);

	const COLORS = [theme.palette.primary.main, theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main];

	const CustomTooltip = ({ active, payload }) => {
		if (active && payload && payload.length) {
			return (
				<Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
					<Typography variant="body2">{`${payload[0].name}: ${toCurrencyFormat(payload[0].value)}`}</Typography>
				</Box>
			);
		}
		return null;
	};

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', py: 1, px: 2 }}>
			<Box sx={{ width: 150, height: 150, position: 'relative' }}>
				<ResponsiveContainer>
					<PieChart>
						<Pie
							data={chartData}
							cx="50%"
							cy="50%"
							labelLine={false}
							outerRadius={70}
							innerRadius={50}
							fill="#8884d8"
							dataKey="value"
							paddingAngle={5}
						>
							{chartData.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
							))}
						</Pie>
						<Tooltip content={<CustomTooltip />} />
					</PieChart>
				</ResponsiveContainer>
				<Box
					sx={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						textAlign: 'center'
					}}
				>
					<Typography variant="caption" color="text.secondary">Net Worth</Typography>
					<Amount value={Math.round(sum)} showSymbol />
				</Box>
			</Box>
			<Stack spacing={1} sx={{ textAlign: 'left' }}>
				{chartData.map((entry, index) => (
					<Stack direction="row" key={entry.name} alignItems="center" spacing={1}>
						<Box sx={{ width: 12, height: 12, bgcolor: COLORS[index % COLORS.length], borderRadius: '2px' }} />
						<Box>
							<Typography variant="caption" color="text.secondary">{entry.name}: </Typography>
							<Amount value={Math.round(entry.value)} showSymbol size="small" />
						</Box>
					</Stack>
				))}
			</Stack>
		</Box>
	);
}

export default Summary;
