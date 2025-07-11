import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Amount from '../../components/Amount';

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
	const summaryAccountList = useMemo(() => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i)), [accountList]);
	const sum = useMemo(() => getSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);
	const financeSum = useMemo(() => getFinanceSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);
	const quickAssetsSum = useMemo(() => getQuickAssetsSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);

	return (
		<Stack direction="row" justifyContent="space-around" alignItems="center" sx={{ textAlign: 'center', py: 1 }}>
			<Box>
				<Typography variant="caption" color="text.secondary">Net Worth</Typography>
				<Amount value={Math.round(sum)} showSymbol/>
			</Box>
			<Box>
				<Typography variant="caption" color="text.secondary">Retirement Assets</Typography>
				<Amount value={Math.round(quickAssetsSum)} showSymbol/>
			</Box>
			<Box>
				<Typography variant="caption" color="text.secondary">Financial Assets</Typography>
				<Amount value={Math.round(financeSum)} showSymbol/>
			</Box>
		</Stack>
	);
}

export default Summary;
