import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import _ from 'lodash';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';

import Amount from '../../components/Amount';

import ReportGrid from '../../components/ReportGrid';
import AccountFilter from '../../components/AccountFilter';

import {
	getHistoryListAction
} from '../../actions/couchdbActions';

import useReturnReport from './useReturnReport';

export function RateOfReturn () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate } = useSelector((state) => state.settings);
	const accountList = useSelector((state) => state.accountList);
	const investementTransactions = allAccountsTransactions.filter(i => i.accountId?.split(':')[1] === 'Invst');
	const cashTransactions = allAccountsTransactions.filter(i => i.accountId?.split(':')[2]?.match(/_Cash/));
	const allInvestments = useSelector((state) => state.allInvestments);
	const historyList = useSelector((state) => state.historyList);
	const allInvestmentAccounts = Object.keys(_.groupBy(investementTransactions, 'account')).map(account => account);
	const [filteredAccounts, setFilteredAccounts] = useState(allInvestmentAccounts);
	const allCashAccounts = Object.keys(_.groupBy(cashTransactions, 'account')).map(account => account).filter(i => i && filteredAccounts.includes(i.split('_')[0]));
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getHistoryListAction());
	}, [dispatch]);

	const onFilteredAccountsChange = (e) => {
		setFilteredAccounts(e);
	};

	const { reportData, geometricMean, overallSummary } = useReturnReport(allInvestments, allAccountsTransactions, investementTransactions, cashTransactions, historyList, filteredAccounts, allCashAccounts, accountList, exchangeRate);

	return (
		<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
			<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
				<AccountFilter
					allAccounts={allInvestmentAccounts}
					filteredAccounts={filteredAccounts}
					setfilteredAccounts={onFilteredAccountsChange}
				/>
			</Stack>
			{/* 전체 기간 요약 표 */}
			{overallSummary && (
				<Box sx={{ mt: 2, mb: 2 }}>
					<Grid container sx={{ width: '100%', mb: 1 }}>
						<Grid item xs={6}>
							<Typography variant="body2" sx={{ fontWeight: 'bold' }}>Final Value: <Amount value={overallSummary.finalValue} showSymbol /></Typography>
						</Grid>
						<Grid item xs={6}>
							<Typography variant="body2" sx={{ fontWeight: 'bold' }}>Final Cash: <Amount value={overallSummary.finalCash} showSymbol /></Typography>
							
						</Grid>
						<Grid item xs={6}>
							<Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Cash Flow: <Amount value={overallSummary.totalCashFlow} showSymbol negativeColor /></Typography>
							
						</Grid>
						<Grid item xs={6}>
							<Typography variant="body2" sx={{ fontWeight: 'bold' }}>Capital Gains: <Amount value={overallSummary.capitalGains} showSymbol negativeColor /></Typography>
							
						</Grid>
						<Grid item xs={6}>
							<Typography variant="body2" sx={{ fontWeight: 'bold' }}>Geometric Mean: {`${((geometricMean - 1) * 100).toFixed(3)}%`}</Typography>
						</Grid>
					</Grid>
				</Box>
			)}
			<Box sx={{ flex: 1, mt: 1 }}>
				{reportData.length > 0 && <ReportGrid reportData={reportData} />}
			</Box>
		</Box>
	);
}

export default RateOfReturn;
