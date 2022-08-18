import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, ColumnSizer, MultiGrid } from 'react-virtualized';

import { styled } from '@mui/material/styles';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 60;
const COLUMN_MIN_WIDTH = 100;

const styleTopLeftGrid = {
	fontWeight: 'bold',
	backgroundColor: 'rgb(249, 250, 251)',
	borderTop: '1px solid rgba(34,36,38,.1)',
	borderBottom: '1px solid rgba(34,36,38,.1)'
};

const styleTopRightGrid = {
	fontWeight: 'bold',
	backgroundColor: 'rgb(249, 250, 251)',
	borderTop: '1px solid rgba(34,36,38,.1)',
	borderBottom: '1px solid rgba(34,36,38,.1)'
};

const styleBottomLeftGrid = {
	backgroundColor: 'rgb(249, 250, 251)'
};

const Cell = styled('div')(() => ({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	borderBottom: '1px solid rgba(34,36,38,.1)',
	borderRight: '1px solid rgba(34,36,38,.1)'
}));

export function PerformanceGrid ({
	performanceData
}) {
	return (
		<div
			style={{
				display: 'flex',
				textAlign: 'center'
			}}
		>
			{
				<AutoSizer disableHeight>
					{({ width }) => (
						<ColumnSizer
							columnMinWidth={COLUMN_MIN_WIDTH}
							columnCount={performanceData[0].length}
							key="GridColumnSizer"
							width={width}>
							{({ adjustedWidth, columnWidth, registerChild }) => (
								<MultiGrid
									ref={registerChild}
									fixedRowCount={1}
									fixedColumnCount={1}
									cellRenderer={({ columnIndex, key, rowIndex, style }) => {
										const value = performanceData[rowIndex][columnIndex];
										const parseValue = parseInt(value, 10);
										const isNumber = !Number.isNaN(parseValue);

										return (
											<Cell key={key} style={style}>
												{isNumber ? <Amount value={parseValue} /> : value}
											</Cell>
										);
									}}
									columnWidth={columnWidth}
									columnCount={performanceData[0].length}
									enableFixedColumnScroll
									enableFixedRowScroll
									hideTopRightGridScrollbar
									hideBottomLeftGridScrollbar
									width={adjustedWidth}
									height={ROW_HEIGHT * performanceData.length + 10}
									rowHeight={ROW_HEIGHT}
									rowCount={performanceData.length}
									styleTopLeftGrid={styleTopLeftGrid}
									styleTopRightGrid={styleTopRightGrid}
									styleBottomLeftGrid={styleBottomLeftGrid}
								/>
							)}
						</ColumnSizer>
					)}
				</AutoSizer>
			}
		</div>
	);
}

PerformanceGrid.propTypes = {
	performanceData: PropTypes.array.isRequired
};

export default PerformanceGrid;