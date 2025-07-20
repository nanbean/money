import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, ColumnSizer, MultiGrid } from 'react-virtualized';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 45;
const COLUMN_MIN_WIDTH = 84;

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
	children: PropTypes.node,
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
	const gridRef = React.useRef(null);

	React.useEffect(() => {
		if (gridRef.current) {
			// When reportData changes, we need to force the grid to re-render its cells.
			// This is a common pattern with react-virtualized.
			gridRef.current.forceUpdateGrids();
		}
	}, [reportData]);

	return (
		<AutoSizer>
			{({ width, height }) => {
				// react-virtualized AutoSizer/ColumnSizer has an issue where it doesn't account for
				// the vertical scrollbar width, causing a horizontal scrollbar to always appear.
				// We check if a vertical scrollbar is needed and adjust the width for ColumnSizer.
				const needsVScroll = reportData.length * ROW_HEIGHT > height;
				const scrollbarWidth = needsVScroll ? 17 : 0; // Approximate scrollbar width

				return (
					<ColumnSizer
						columnMinWidth={COLUMN_MIN_WIDTH}
						columnCount={reportData[0].length}
						width={width - scrollbarWidth}
					>
						{({ columnWidth, registerChild }) => (
							<MultiGrid
								ref={(ref) => {
									// Assign the ref to our local ref
									gridRef.current = ref;
									// Also pass it to the ColumnSizer
									registerChild(ref);
								}}
								fixedRowCount={1}
								fixedColumnCount={1}
								cellRenderer={({ columnIndex, key, rowIndex, style }) => {
									const item = reportData[rowIndex][columnIndex];
									const cellColor = item.cellColor;
									const { type, value } = item;
									const isNumber = typeof value === 'number';

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
											<ReportCell key={key} style={style} cellColor={cellColor} onClick={supportSearch && item.startDate && item.endDate ? handleClick : null}>
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
												{isNumber ? <Amount value={value} /> : <Text title={value === null || value === undefined ? '' : String(value)} />}
											</ReportCell>
										);
									}
								}}
								columnWidth={columnWidth}
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
					</ColumnSizer>
				);
			}}
		</AutoSizer>
	);
}

ReportGrid.propTypes = {
	reportData: PropTypes.array.isRequired,
	supportSearch: PropTypes.bool
};

export default ReportGrid;
