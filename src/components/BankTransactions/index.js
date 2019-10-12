import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, Column, Table } from 'react-virtualized';
import _ from 'lodash';

import Amount from '../Amount';
import Payee from '../../common/Payee';

import { toDateFormat } from '../../utils/formatting';

import 'react-virtualized/styles.css'; // only needs to be imported once
import './index.css';

class BankTransactions extends Component {
	shouldComponentUpdate (nextProps) {
		if (_.isEqual(this.props.transactions, nextProps.transactions)) {
			return false;
		}

		return true;
	}

	onRowSelect = ({ index }) => {
		const { account, transactions } = this.props;
		const transaction = transactions[index];

		this.props.openTransactionInModal({
			account: transaction.account || account,
			date: transaction.date,
			payee: transaction.payee,
			category: transaction.category + (transaction.subcategory ? `:${transaction.subcategory}` : ''),
			amount: transaction.amount,
			memo: transaction.memo,
			isEdit: true,
			index: index
		});
	}

	render () {
		const { showAccount, transactions } = this.props;

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
								rowHeight={30}
								scrollToIndex={transactions.length-1}
								rowCount={transactions.length}
								rowGetter={({ index }) => transactions[index]}
								onRowClick={this.onRowSelect}
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
								<Column
									label="Date"
									dataKey="date"
									width={width/4}
									cellRenderer={({ cellData }) => toDateFormat(cellData)}
								/>
								<Column
									label="Payee"
									dataKey="payee"
									width={width/2}
									cellDataGetter={({ rowData }) => ({ category: rowData.category, payee: rowData.payee })}
									cellRenderer={({ cellData }) => <Payee value={cellData.payee} category={cellData.category} />}
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
}

BankTransactions.propTypes = {
	account: PropTypes.string,
	openTransactionInModal: PropTypes.func,
	showAccount: PropTypes.bool,
	transactions: PropTypes.array
};

export default BankTransactions;
