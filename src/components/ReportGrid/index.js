import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, MultiGrid } from 'react-virtualized';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';

import useWidth from '../../hooks/useWidth';
import useHeight from '../../hooks/useHeight';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 45;
const COLUMN_WIDTH = 84;

const ReportCell = ({
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

ReportCell.propTypes = {
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

export function ReportGrid ({
	reportData,
	supportSearch = false
}) {
	const navigate = useNavigate();
	const width = useWidth();
	const isWidthUpLg = width !== 'xs' && width !== 'sm' && width !== 'md';
	const reportHeight = useHeight() - 64 - 64 - 64 - 100 - 200; // TODO: Optimize calculation

	return (
		<div
			style={{
				display: 'flex',
				height: reportHeight,
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
									const item = reportData[rowIndex][columnIndex];
									const cellColor = item.cellColor;
									const type = item.type;
									const value = item.value;
									const parseValue = parseInt(value, 10);
									const isNumber = !Number.isNaN(parseValue);

									const handleClick = () => {
										if (item.startDate && item.endDate && item.category) {
											if (item.category.includes(':')) {
												const categoryArray = item.category.split(':');
												navigate(`/search?startDate=${item.startDate}&endDate=${item.endDate}&category=${encodeURIComponent(categoryArray[0])}&subcategory=${encodeURIComponent(categoryArray[1])}`);
											} else {
												navigate(`/search?startDate=${item.startDate}&endDate=${item.endDate}&category=${encodeURIComponent(item.category)}`);
											}
										} else if (item.startDate && item.endDate) {
											navigate(`/search?startDate=${item.startDate}&endDate=${item.endDate}`);
										}
									};
							
									if (type === 'label') {
										return (
											<ReportCell key={key} style={style} cellColor={cellColor}>
												<Text title={value} />
											</ReportCell>
										);
									} else if (typeof value === 'string' && value.includes('%')) {
										return (
											<ReportCell key={key} style={style} cellColor={cellColor}>
												<Text title={value} />
											</ReportCell>
										);
									} else {
										return (
											<ReportCell key={key} style={style} cellColor={cellColor} onClick={supportSearch ? handleClick:null}>
												{isNumber ? <Amount value={typeof value == 'string' ? value:parseValue} /> : <Text title={value} />}
											</ReportCell>
										);
									}
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
	reportData: PropTypes.array.isRequired,
	supportSearch: PropTypes.bool
};

export default ReportGrid;
