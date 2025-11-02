import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import { styled } from '@mui/material/styles';
import { AutoSizer, Column, Table } from 'react-virtualized';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Amount from '../Amount';

import useWidth from '../../hooks/useWidth';

import { toDateFormat, toCurrencyFormatWithSymbol } from '../../utils/formatting';

import {
	openTransactionInModal
} from '../../actions/ui/form/bankTransaction';

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

export function InvestmentTransactions ({
	currency,
	transactions
}) {
	const width = useWidth();
	const isSmallScreen = width === 'xs' || width === 'sm';

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
				<StyledTable
					width={width}
					height={height}
					headerHeight={44}
					rowHeight={!isSmallScreen ? 38 : 55}
					scrollToIndex={transactions.length-1}
					rowCount={transactions.length}
					rowGetter={({ index }) => transactions[index]}
					onRowClick={onRowSelect}
				>
					{
						!isSmallScreen && <Column
							label="Date"
							dataKey="date"
							width={isSmallScreen ? width/5:width/6}
							headerRenderer={({ label }) => (
								<Typography align="center" variant="subtitle2" color="secondary">{label}</Typography>
							)}
							cellRenderer={({ cellData }) => (
								<Typography align="center" variant="body2">{toDateFormat(cellData)}</Typography>
							)}
						/>
					}
					<Column
						label="Investment"
						dataKey="investment"
						width={isSmallScreen ? width/5*2:width/3}
						cellDataGetter={({ rowData }) => ({ date: rowData.date, investment: rowData.investment })}
						cellRenderer={({ cellData }) => {
							if (isSmallScreen) {
								return (
									<Stack alignItems="center">
										<Typography
											variant="body2"
										>
											{cellData.investment}
										</Typography >
										<Typography variant="caption" sx={{ color: 'grey.500' }}>
											{toDateFormat(cellData.date)}
										</Typography>
									</Stack>
								);
							} else {
								return (
									<Typography
										variant="body2"
										align="center"
									>
										{cellData.investment}
									</Typography >
								);
							}

						}}
						headerRenderer={({ label }) => {
							return <Typography align="center" variant="subtitle2" color="secondary">{label}</Typography>;
						}}
					/>
					<Column
						label="Act."
						dataKey="activity"
						width={isSmallScreen ? width/5:width/10}
						headerRenderer={({ label }) => (
							<Typography align="center" variant="subtitle2" color="secondary">{label}</Typography>
						)}
						cellRenderer={({ cellData }) => (
							<Typography align="center" variant="body2">{cellData}</Typography>
						)}
					/>
					{
						!isSmallScreen && <Column
							label="Qty."
							dataKey="quantity"
							width={width/10}
							cellRenderer={({ cellData }) => (
								<Stack alignItems="flex-end">
									<Amount value={cellData} ignoreDisplayCurrency showColor={false} />
								</Stack>
							)}
							headerRenderer={({ label }) => (
								<Typography align="right" variant="subtitle2" color="secondary">{label}</Typography>
							)}
						/>
					}
					{
						!isSmallScreen && <Column
							label="Price"
							dataKey="price"
							width={width/9}
							cellRenderer={({ cellData }) => (
								<Stack alignItems="flex-end">
									<Amount value={cellData} ignoreDisplayCurrency showColor={false} showSymbol currency={currency} />
								</Stack>
							)}
							headerRenderer={({ label }) => (
								<Typography align="right" variant="subtitle2" color="secondary">{label}</Typography>
							)}
						/>
					}
					{
						!isSmallScreen &&
						<Column
							label="Comm."
							dataKey="commission"
							width={width/7}
							headerRenderer={({ label }) => (
								<Typography align="right" variant="subtitle2" color="secondary">{label}</Typography>
							)}
							cellRenderer={({ cellData }) => (
								<Stack alignItems="flex-end">
									<Amount value={cellData} ignoreDisplayCurrency showColor={false} />
								</Stack>
							)}
						/>
					}
					<Column
						width={isSmallScreen ? width/5*2:width/6}
						label="Amount"
						dataKey="amount"
						cellDataGetter={({ rowData }) => ({ activity: rowData.activity, quantity: rowData.quantity, price: rowData.price, amount: rowData.amount })}
						cellRenderer={({ cellData }) => {
							if (isSmallScreen) {
								return (
									<Stack alignItems="flex-end">
										<Amount value={cellData.amount} ignoreDisplayCurrency showColor={false} showSymbol currency={currency} />
										{
											(cellData.activity === 'Buy' || cellData.activity === 'Sell') && <Typography variant="caption" sx={{ color: 'grey.500' }}>
												{`${cellData.quantity} * ${toCurrencyFormatWithSymbol(cellData.price, currency)}`}
											</Typography>
										}
									</Stack>
								);
							} else {
								return (
									<Stack alignItems="flex-end">
										<Amount value={cellData.amount} ignoreDisplayCurrency showColor={false} showSymbol currency={currency} />
									</Stack>
								);
							}

						}}
						headerRenderer={({ label }) => <Typography align="right" variant="subtitle2" color="secondary">{label}</Typography>}
					/>
				</StyledTable>
			)}
		</AutoSizer>
	);
}

InvestmentTransactions.propTypes = {
	currency: PropTypes.string,
	transactions: PropTypes.array
};

export default InvestmentTransactions;
