import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import { AutoSizer, Column, Table } from 'react-virtualized';

import Stack from '@mui/material/Stack';

import Amount from '../Amount';
import Payee from '../Payee';
import CategoryIcon from '../CategoryIcon';

import useWidth from '../../hooks/useWidth';

import { toDateFormat } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import 'react-virtualized/styles.css'; // only needs to be imported once
import './index.css';

export function BankTransactions ({
	account,
	showAccount,
	transactions
}) {
	const width = useWidth();
	const isWidthDownMd = width === 'xs' || width === 'sm';

	const dispatch = useDispatch();

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
		<div className="bank-transaction">
			{
				transactions &&
				<AutoSizer>
					{({ height, width }) => (
						<Table
							headerClassName="header"
							rowClassName="row"
							width={width}
							height={height}
							headerHeight={40}
							rowHeight={!isWidthDownMd ? 30 : 60}
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
									cellRenderer={({ cellData }) => cellData}
								/>
							}
							{
								!isWidthDownMd &&
								<Column
									label="Date"
									dataKey="date"
									width={width/4}
									cellRenderer={({ cellData }) => toDateFormat(cellData)}
								/>
							}
							{
								<Column
									label="Category"
									dataKey="category"
									width={width/4}
									cellRenderer={({ cellData }) => <CategoryIcon category={cellData} fontsize={!isWidthDownMd ? 20 : 40}/>}
								/>
							}
							<Column
								label="Payee"
								dataKey="payee"
								width={width/2}
								cellDataGetter={({ rowData }) => ({ date: rowData.date, category: rowData.category, payee: rowData.payee, amount: rowData.amount })}
								cellRenderer={({ cellData }) => {
									if (isWidthDownMd) {
										return (
											<Stack>
												<Payee value={cellData.payee} category={cellData.category} />
												<div>
													{toDateFormat(cellData.date)}
												</div>
											</Stack>
										);
									} else {
										return (
											<Payee value={cellData.payee} category={cellData.category} />
										);
									}
								}}
							/>
							<Column
								width={width/4}
								label="Amount"
								dataKey="amount"
								cellRenderer={({ cellData }) => <Amount value={cellData} />}
							/>
						</Table>
					)}
				</AutoSizer>
			}
		</div>
	);
}

BankTransactions.propTypes = {
	account: PropTypes.string,
	showAccount: PropTypes.bool,
	transactions: PropTypes.array
};

export default BankTransactions;
