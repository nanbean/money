import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, ColumnSizer, MultiGrid } from 'react-virtualized';

import Box from '@mui/material/Box';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 60;
const COLUMN_MIN_WIDTH = 100;

const NormalCell = ({
	cellColor = false,
	children,
	onClick,
	style
}) => (
	<Box onClick={onClick} style={style} sx={{
		flex: 1,
		display: 'flex',
		alignItems: 'center',
		boxSizing: 'border-box',
		justifyContent: 'center',
		height: ROW_HEIGHT,
		backgroundColor: cellColor ? 'rgba(180, 180, 180, .5)':null,
		borderBottom: '1px solid rgba(81, 81, 81, 1)'
	}}>
		{children}
	</Box>
);

NormalCell.propTypes = {
	cellColor: PropTypes.bool,
	children: PropTypes.object,
	onClick: PropTypes.func,
	style: PropTypes.object
};

const Text = ({
	title
}) => (
	<Typography
		variant="body2"
	>
		{title}
	</Typography >
);

Text.propTypes = {
	title: PropTypes.string
};

export function NormalGrid ({
	gridData
}) {
	return (
		<div 
			style={{
				display: 'flex',
				textAlign: 'center'
			}}
		>
			{
				<TableContainer>
					<AutoSizer disableHeight>
						{({ width }) => (
							<ColumnSizer
								columnMinWidth={COLUMN_MIN_WIDTH}
								columnCount={gridData[0].length}
								key="GridColumnSizer"
								width={width}>
								{({ adjustedWidth, columnWidth, registerChild }) => (
									<MultiGrid
										ref={registerChild}
										fixedRowCount={1}
										fixedColumnCount={1}
										cellRenderer={({ columnIndex, key, rowIndex, style }) => {
											const item = gridData[rowIndex][columnIndex];
											const { type, currency, value, showOriginal } = item;
											const parseValue = parseInt(value, 10);
											const isNumber = !Number.isNaN(parseValue);
			
											if (type === 'label') {
												return (
													<NormalCell key={key} style={style}>
														<Text title={value} />
													</NormalCell>
												);
											} else if (type === 'currency') {
												return (
													<NormalCell key={key} style={style}>
														<Amount value={value} negativeColor showSymbol currency={currency}/>
													</NormalCell>
												);
											} else if (type === 'noColorCurrency') {
												return (
													<NormalCell key={key} style={style}>
														<Amount value={value} showColor={false} showOriginal={showOriginal} showSymbol currency={currency}/>
													</NormalCell>
												);
											} else if (typeof value === 'string' && value.includes('%')) {
												return (
													<NormalCell key={key} style={style}>
														<Text title={value} />
													</NormalCell>
												);
											} else {
												return (
													<NormalCell key={key} style={style}>
														{isNumber ? <Amount value={parseValue} showColor={false}/> : value}
													</NormalCell>
												);
											}
										}}
										columnWidth={columnWidth}
										columnCount={gridData[0].length}
										enableFixedColumnScroll
										enableFixedRowScroll
										hideTopRightGridScrollbar
										hideBottomLeftGridScrollbar
										width={adjustedWidth}
										height={ROW_HEIGHT * gridData.length + 10}
										rowHeight={ROW_HEIGHT}
										rowCount={gridData.length}
									/>
								)}
							</ColumnSizer>
						)}
					</AutoSizer>
				</TableContainer>
			}
		</div>
	);
}

NormalGrid.propTypes = {
	gridData: PropTypes.array
};

export default NormalGrid;
