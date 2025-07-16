import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { styled } from '@mui/material/styles';
import { AutoSizer, Column, Table } from 'react-virtualized';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Amount from '../Amount';
import Payee from '../Payee';
import CategoryIcon from '../CategoryIcon';

import useWidth from '../../hooks/useWidth';

import { toDateFormat } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import { TYPE_ICON_MAP } from '../../constants';

import 'react-virtualized/styles.css'; // only needs to be imported once

const StyledTable = styled(Table)(({ theme }) => ({
	'& .ReactVirtualized__Table__headerRow': {
		borderBottom: `1px solid ${theme.palette.divider}` // 헤더에도 구분선 추가
	},
	'& .ReactVirtualized__Table__row': {
		cursor: 'pointer',
		borderBottom: `1px solid ${theme.palette.divider}`, // 각 행의 아래에 구분선 추가
		'&:hover': {
			backgroundColor: theme.palette.action.hover
		}
	}
}));

export function BankTransactions ({
	account,
	currency,
	showAccount,
	transactions
}) {
	const width = useWidth();
	const isWidthDownMd = width === 'xs' || width === 'sm';

	const dispatch = useDispatch();
	const accountList = useSelector(state => state.accountList);

	const onRowSelect = ({ index }) => {
		const transaction = transactions[index];

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

	return (
		transactions &&
		<AutoSizer>
			{({ height, width }) => (
				<StyledTable
					width={width}
					height={height}
					headerHeight={44}
					rowHeight={!isWidthDownMd ? 38 : 55}
					scrollToIndex={transactions.length-1}
					rowCount={transactions.length}
					rowGetter={({ index }) => transactions[index]}
					onRowClick={onRowSelect}
				>
					{
						showAccount &&
						<Column
							label="Account"
							dataKey="account"
							width={width/4}
							cellDataGetter={({ rowData }) => ({ type: rowData.type, account: rowData.account })}
							cellRenderer={({ cellData }) => {
								const IconComponent = TYPE_ICON_MAP[cellData.type];
								
								return (
									<Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
										{IconComponent && <IconComponent sx={{ fontSize: 12 }} />}
										<Typography variant="body2">{cellData.account}</Typography>
									</Stack>
								);
							}}
							headerRenderer={({ label }) => (
								<Typography variant="subtitle2" color="secondary">{label}</Typography>
							)}
						/>
					}
					{
						!isWidthDownMd &&
						<Column
							label="Date"
							dataKey="date"
							width={width/4}
							cellRenderer={({ cellData }) => (
								<Typography variant="body2">{toDateFormat(cellData)}</Typography>
							)}
							headerRenderer={({ label }) => (
								<Typography variant="subtitle2" color="secondary">{label}</Typography>
							)}
						/>
					}
					{
						<Column
							label="Category"
							dataKey="category"
							width={width/4}
							cellRenderer={({ cellData }) => (
								<CategoryIcon category={cellData} fontsize={!isWidthDownMd ? 22 : 30} />
							)}
							headerRenderer={({ label }) => (
								<Typography variant="subtitle2" color="secondary">{label}</Typography>
							)}
						/>
					}
					<Column
						label="Payee"
						dataKey="payee"
						width={width/2}
						cellDataGetter={({ rowData }) => ({ date: rowData.date, category: rowData.category, payee: rowData.payee, amount: rowData.amount })}
						cellRenderer={({ cellData }) => (
							<Payee value={cellData.payee} category={cellData.category} />
						)}
						headerRenderer={({ label }) => (
							<Typography variant="subtitle2" color="secondary">{label}</Typography>
						)}
					/>
					<Column
						width={width/4}
						label="Amount"
						dataKey="amount"
						cellDataGetter={({ rowData }) => {
							let accountCurrency = currency;
							if (!accountCurrency && rowData.accountId && accountList) {
								const acc = accountList.find(a => a._id === rowData.accountId);
								if (acc && acc.currency) accountCurrency = acc.currency;
							}
							return { date: rowData.date, amount: rowData.amount, currency: accountCurrency };
						}}
						cellRenderer={({ cellData }) => (
							isWidthDownMd ? (
								<Stack spacing={0.5}>
									<Amount value={cellData.amount} ignoreDisplayCurrency showSymbol currency={cellData.currency} style={{ fontWeight: 700, fontSize: 18, color: '#1976d2' }} />
									<Typography variant="caption">
										{toDateFormat(cellData.date)}
									</Typography>
								</Stack>
							) : (
								<Amount value={cellData.amount} ignoreDisplayCurrency showSymbol currency={cellData.currency} style={{ fontWeight: 700, color: '#1976d2' }} />
							)
						)}
						headerRenderer={({ label }) => (
							<Typography variant="subtitle2" color="secondary">{label}</Typography>
						)}
					/>
				</StyledTable>
			)}
		</AutoSizer>
	);
}

BankTransactions.propTypes = {
	account: PropTypes.string,
	currency: PropTypes.string,
	showAccount: PropTypes.bool,
	transactions: PropTypes.array
};

export default BankTransactions;
