import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, MultiGrid } from 'react-virtualized';

import { styled } from '@mui/material/styles';

import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';

import useWidth from '../../hooks/useWidth';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 45;
const COLUMN_WIDTH = 84;

const ReportCell = styled('div')(() => ({
	flex: 1,
	display: 'flex',
	alignItems: 'center',
	boxSizing: 'border-box',
	justifyContent: 'center',
	height: ROW_HEIGHT,
	borderBottom: '1px solid rgba(81, 81, 81, 1)'
}));

const SumCell = styled('div')(() => ({
	flex: 1,
	display: 'flex',
	alignItems: 'center',
	boxSizing: 'border-box',
	justifyContent: 'center',
	height: ROW_HEIGHT,
	backgroundColor: 'rgba(180, 180, 180, .5)',
	borderBottom: '1px solid rgba(81, 81, 81, 1)'
}));

const Category = ({
	category
}) => (
	<Typography
		variant="body2"
	>
		{category}
	</Typography >
);

Category.propTypes = {
	category: PropTypes.string
};

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
				<TableContainer>
					<AutoSizer>
						{({ width, height }) => (
							<MultiGrid
								fixedRowCount={1}
								fixedColumnCount={1}
								cellRenderer={({ columnIndex, key, rowIndex, style }) => {
									const value = reportData[rowIndex][columnIndex];
									const parseValue = parseInt(value, 10);
									const isNumber = !Number.isNaN(parseValue);
							
									if (reportData[rowIndex][0] === 'Income Total' || reportData[rowIndex][0] === 'Expense Total') {
										return (
											<SumCell key={key} style={style}>
												{isNumber ? <Amount value={parseValue} /> : <Category category={value} />}
											</SumCell>
										);
									}
									return (
										<ReportCell key={key} style={style}>
											{isNumber ? <Amount value={parseValue} /> : <Category category={value} />}
										</ReportCell>
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
							/>
						)}
					</AutoSizer>
				</TableContainer>
			}
		</div>
	);
}

ReportGrid.propTypes = {
	reportData: PropTypes.array.isRequired
};

export default ReportGrid;
