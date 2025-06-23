import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import _ from 'lodash';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import ReportGrid from '../../components/ReportGrid';
import AccountFilter from '../../components/AccountFilter';

import {
	getHistoryListAction
} from '../../actions/couchdbActions';

import useReturnReport from './useReturnReport';

export function RateOfReturn () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
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

	const { reportData, geometricMean } = useReturnReport(allInvestments, allAccountsTransactions, investementTransactions, cashTransactions, historyList, filteredAccounts, allCashAccounts);

	return (
		<Box
			sx={{
				height: 'calc(100vh - 192px)',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			<AccountFilter
				allAccounts={allInvestmentAccounts}
				filteredAccounts={filteredAccounts}
				setfilteredAccounts={onFilteredAccountsChange}
			/>
			<Typography variant="subtitle1" gutterBottom>
				{`Geometric Mean : ${((geometricMean - 1) * 100).toFixed(3)}%`}
			</Typography>
			<Box sx={{ flex: 1, mt: 1 }}>
				{reportData.length > 0 && <ReportGrid reportData={reportData} />}
			</Box>
		</Box>
	);
}

export default RateOfReturn;
