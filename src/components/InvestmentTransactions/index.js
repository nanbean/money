import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import { AutoSizer, Column, Table } from 'react-virtualized';

import Typography from '@mui/material/Typography';

import Amount from '../Amount';

import useWidth from '../../hooks/useWidth';

import { toDateFormat } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

import 'react-virtualized/styles.css'; // only needs to be imported once

export function InvestmentTransactions ({
	currency,
	transactions
}) {
	const width = useWidth();
	const isWidthDownMd = width === 'xs' || width === 'sm';

	const dispatch = useDispatch();

	const onRowSelect = ({ index }) => {
		const transaction = transactions[index];

		dispatch(openTransactionInModal({
			date: transaction.date,
			investment: transaction.investment,
			activity: transaction.activity,
			quantity: transaction.quantity,
			price: transaction.price,
			commission: transaction.commission ? transaction.commission : '',
			amount: transaction.amount,
			isEdit: true,
			index: index
		}));
	};

	return (
		transactions &&
		<AutoSizer>
			{({ height, width }) => (
				<Table
					headerClassName="header"
					width={width}
					height={height}
					headerHeight={40}
					rowHeight={!isWidthDownMd ? 30 : 50}
					scrollToIndex={transactions.length-1}
					rowCount={transactions.length}
					rowGetter={({ index }) => transactions[index]}
					onRowClick={onRowSelect}
				>
					{
						!isWidthDownMd && <Column
							label="Date"
							dataKey="date"
							width={isWidthDownMd ? width/5:width/6}
							cellRenderer={({ cellData }) => toDateFormat(cellData)}
						/>
					}
					<Column
						label="Investment"
						dataKey="investment"
						width={isWidthDownMd ? width/5*2:width/3}
						cellDataGetter={({ rowData }) => ({ date: rowData.date, investment: rowData.investment })}
						cellRenderer={({ cellData }) => {
							if (isWidthDownMd) {
								return (
									<React.Fragment>
										<Typography
											variant="body2"
										>
											{cellData.investment}
										</Typography >
										<Typography variant="caption" sx={{ color: 'rgb(158, 158, 164)' }}>
											{toDateFormat(cellData.date)}
										</Typography>
									</React.Fragment>
								);
							} else {
								return (
									<Typography
										variant="body2"
									>
										{cellData.investment}
									</Typography >
								);
							}

						}
						}
					/>
					<Column
						label="Activity"
						dataKey="activity"
						width={isWidthDownMd ? width/5:width/10}
					/>
					{
						!isWidthDownMd && <Column
							label="Quantity"
							dataKey="quantity"
							width={width/10}
							cellRenderer={({ cellData }) => <Amount value={cellData} showColor={false} />}
						/>
					}
					{
						!isWidthDownMd && <Column
							label="Price"
							dataKey="price"
							width={width/9}
							cellRenderer={({ cellData }) => <Amount value={cellData} showColor={false} showSymbol currency={currency} />}
						/>
					}
					{
						!isWidthDownMd &&
						<Column
							label="Commission"
							dataKey="commission"
							width={width/7}
							cellRenderer={({ cellData }) => cellData ? <Amount value={cellData} showColor={false} /> : ''}
						/>
					}
					<Column
						width={isWidthDownMd ? width/5*2:width/6}
						label="Amount"
						dataKey="amount"
						cellDataGetter={({ rowData }) => ({ quantity: rowData.quantity, price: rowData.price, amount: rowData.amount })}
						cellRenderer={({ cellData }) => {
							if (isWidthDownMd) {
								return (
									<React.Fragment>
										<Amount value={cellData.amount} showColor={false} showSymbol currency={currency} />
										<Typography variant="caption" sx={{ color: 'rgb(158, 158, 164)' }}>
											{`${cellData.price} * ${cellData.amount.toLocaleString()}`}
										</Typography>
									</React.Fragment>
								);
							} else {
								return (
									<Amount value={cellData.amount} showColor={false} showSymbol currency={currency} />
								);
							}

						}
						}
					/>
				</Table>
			)}
		</AutoSizer>
	);
}

InvestmentTransactions.propTypes = {
	currency: PropTypes.string,
	transactions: PropTypes.array
};

export default InvestmentTransactions;
