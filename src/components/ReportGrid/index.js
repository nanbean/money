import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, MultiGrid } from 'react-virtualized';

import { styled } from '@mui/material/styles';

import useWidth from '../../hooks/useWidth';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 40;
const COLUMN_WIDTH = 84;

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

export function ReportGrid ({
	reportData
}) {
	const width = useWidth();
	const isWidthUpLg = width !== 'xs' && width !== 'sm' && width !== 'md';

	return (
		<div
			style={{
				display: 'flex',
				height: '65vh',
				textAlign: 'center'
			}}
		>
			{
				<AutoSizer>
					{({ width, height }) => (
						<MultiGrid
							fixedRowCount={1}
							fixedColumnCount={1}
							cellRenderer={({ columnIndex, key, rowIndex, style }) => {
								const value = reportData[rowIndex][columnIndex];
								const parseValue = parseInt(value, 10);
								const isNumber = !Number.isNaN(parseValue);

								return (
									<Cell key={key} style={style}>
										{isNumber ? <Amount value={parseValue} /> : value}
									</Cell>
								);
							}}
							columnWidth={isWidthUpLg ? width / 14 - 2 : COLUMN_WIDTH}
							columnCount={reportData[0].length}
							enableFixedColumnScroll
							enableFixedRowScroll
							hideTopRightGridScrollbar
							hideBottomLeftGridScrollbar
							width={width}
							height={height}
							rowHeight={ROW_HEIGHT}
							rowCount={reportData.length}
							styleTopLeftGrid={styleTopLeftGrid}
							styleTopRightGrid={styleTopRightGrid}
							styleBottomLeftGrid={styleBottomLeftGrid}
						/>
					)}
				</AutoSizer>
			}
		</div>
	);
}

ReportGrid.propTypes = {
	reportData: PropTypes.array.isRequired
};

export default ReportGrid;
