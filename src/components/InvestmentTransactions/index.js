import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, Column, Table } from 'react-virtualized';

import Amount from '../Amount';

import useMobile from '../../hooks/useMobile';

import { toDateFormat } from '../../utils/formatting';

import 'react-virtualized/styles.css'; // only needs to be imported once
import './index.css';

export function InvestmentTransactions ({
	openTransactionInModal,
	transactions
}) {
	const isMobile = useMobile();

	const onRowSelect = ({ index }) => {
		const transaction = transactions[index];

		openTransactionInModal({
			date: transaction.date,
			investment: transaction.investment,
			activity: transaction.activity,
			quantity: transaction.quantity,
			price: transaction.price,
			commission: transaction.commission ? transaction.commission : '',
			amount: transaction.amount,
			isEdit: true,
			index: index
		});
	}

	return (
		<div className="investment-transaction">
			<div style={{ flex: '1 0.8 auto' }}>
				{
					transactions &&
					<AutoSizer>
						{({ height, width }) => (
							<Table
								width={width}
								height={height}
								headerHeight={20}
								rowHeight={30}
								scrollToIndex={transactions.length-1}
								rowCount={transactions.length}
								rowGetter={({ index }) => transactions[index]}
								onRowClick={onRowSelect}
							>
								<Column
									label="Date"
									dataKey="date"
									width={width/6}
									cellRenderer={({ cellData }) => toDateFormat(cellData)}
								/>
								<Column
									label="Investment"
									dataKey="investment"
									width={width/3}
								/>
								<Column
									label="Activity"
									dataKey="activity"
									width={width/10}
								/>
								<Column
									label="Quantity"
									dataKey="quantity"
									width={width/10}
									cellRenderer={({ cellData }) => <Amount value={cellData} />}
								/>
								<Column
									label="Price"
									dataKey="price"
									width={width/9}
									cellRenderer={({ cellData }) => <Amount value={cellData} />}
								/>
								{
									!isMobile &&
									<Column
										label="Commission"
										dataKey="commission"
										width={width/7}
										cellRenderer={({ cellData }) => cellData ? <Amount value={cellData} /> : ''}
									/>
								}
								<Column
									width={width/6}
									label="Amount"
									dataKey="amount"
									cellRenderer={({ cellData }) => <Amount value={cellData} />}
								/>
							</Table>
						)}
					</AutoSizer>
				}
			</div>
		</div>
	);
}

InvestmentTransactions.propTypes = {
	openTransactionInModal: PropTypes.func,
	transactions: PropTypes.array
};

export default InvestmentTransactions;
