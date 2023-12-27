import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, ColumnSizer, MultiGrid } from 'react-virtualized';

import { styled } from '@mui/material/styles';

import TableContainer from '@mui/material/TableContainer';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 60;
const COLUMN_MIN_WIDTH = 100;

const NormalCell = styled('div')(() => ({
	flex: 1,
	display: 'flex',
	alignItems: 'center',
	boxSizing: 'border-box',
	justifyContent: 'center',
	height: ROW_HEIGHT,
	borderBottom: '1px solid rgba(81, 81, 81, 1)'
}));

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
											const value = gridData[rowIndex][columnIndex];
											const parseValue = parseInt(value, 10);
											const isNumber = !Number.isNaN(parseValue);
			
											return (
												<NormalCell key={key} style={style}>
													{isNumber ? <Amount value={parseValue} /> : value}
												</NormalCell>
											);
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
