import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import Amount from '../../components/Amount';

const quickAssetAccount = [
	'키움증권맥쿼리',
	'키움증권',
	'몬쁭스SK증권',
	'동양종금장마',
	'급여계좌',
	'KB체크카드',
	'KB카드',
	'LG카드',
	'생활비카드',
	'지갑',
	'연금저축',
	'IRP',
	'IRP오은미'
];

const getSum = (accounts, exchangeRate) => accounts.map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((sum, i) => sum + i, 0);
const getFinanceSum = (accounts, exchangeRate) => accounts.filter(i => i.type !== 'Oth A').map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((sum, i) => sum + i, 0);
const getQuickAssetsSum = (accounts, exchangeRate) => accounts.filter(i => quickAssetAccount.find(j => j === i.name)).map(i => i.currency === 'USD' ? i.balance * exchangeRate : i.balance).reduce((sum, i) => sum + i, 0);

export function Summary () {
	const accountList = useSelector((state) => state.accountList);
	const exchangeRate = useSelector((state) => state.settings.exchangeRate);

	const summaryAccountList = useMemo(() => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i)), [accountList]);
	const sum = useMemo(() => getSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);
	const financeSum = useMemo(() => getFinanceSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);
	const quickAssetsSum = useMemo(() => getQuickAssetsSum(summaryAccountList, exchangeRate), [summaryAccountList, exchangeRate]);

	return (
		<Table>
			<TableBody>
				<TableRow>
					<TableCell align="center"><Amount value={sum} /></TableCell>
					<TableCell align="center"><Amount value={quickAssetsSum} /></TableCell>
					<TableCell align="center"><Amount value={financeSum} /></TableCell>
				</TableRow>
			</TableBody>
		</Table>
	);
}

export default Summary;
