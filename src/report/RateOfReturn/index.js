import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import _ from 'lodash';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

import Amount from '../../components/Amount';

import ReportGrid from '../../components/ReportGrid';
import AccountFilter from '../../components/AccountFilter';

import {
	getHistoryListAction
} from '../../actions/couchdbActions';

import useReturnReport from './useReturnReport';

export function RateOfReturn () {
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate } = useSelector((state) => state.settings.general);
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
		<Box
			sx={{
				height: 'calc(100vh - 192px)',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
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
					<Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mb: 1 }}>
						<tbody>
							<tr>
								<td style={{ padding: 4 }}><Typography variant="body2" sx={{ fontWeight: 'bold' }}>Final Value</Typography></td>
								<td style={{ padding: 4 }}><Amount value={overallSummary.finalValue} showSymbol /></td>
								<td style={{ padding: 4 }}><Typography variant="body2" sx={{ fontWeight: 'bold' }}>Final Cash</Typography></td>
								<td style={{ padding: 4 }}><Amount value={overallSummary.finalCash} showSymbol /></td>
							</tr>
							<tr>
								<td style={{ padding: 4 }}><Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Cash Flow</Typography></td>
								<td style={{ padding: 4 }}><Amount value={overallSummary.totalCashFlow} showSymbol negativeColor /></td>
								<td style={{ padding: 4 }}><Typography variant="body2" sx={{ fontWeight: 'bold' }}>Capital Gains</Typography></td>
								<td style={{ padding: 4 }}><Amount value={overallSummary.capitalGains} showSymbol negativeColor /></td>
							</tr>
							<tr>
								<td style={{ padding: 4 }}><Typography variant="body2" sx={{ fontWeight: 'bold' }}>Geometric Mean</Typography></td>
								<td style={{ padding: 4 }}><Typography variant="body2">{`${((geometricMean - 1) * 100).toFixed(3)}%`}</Typography></td>
								<td></td><td></td>
							</tr>
						</tbody>
					</Box>
				</Box>
			)}
			<Box sx={{ flex: 1, mt: 1 }}>
				{reportData.length > 0 && <ReportGrid reportData={reportData} />}
			</Box>
		</Box>
	);
}

export default RateOfReturn;
