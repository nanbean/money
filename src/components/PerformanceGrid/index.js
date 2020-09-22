import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { AutoSizer, ColumnSizer, MultiGrid } from 'react-virtualized';

import Amount from '../Amount';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 60;
const COLUMN_MIN_WIDTH = 100;

const styles = () => ({
	performanceGrid: {
		display: 'flex',
		textAlign: 'center'
	},
	cell: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderBottom: '1px solid rgba(34,36,38,.1)',
		borderRight: '1px solid rgba(34,36,38,.1)'
	},
	topLeftGrid: {
		fontWeight: 'bold',
		backgroundColor: 'rgb(249, 250, 251)',
		borderTop: '1px solid rgba(34,36,38,.1)',
		borderBottom: '1px solid rgba(34,36,38,.1)'
	},
	topRightGrid: {
		fontWeight: 'bold',
		backgroundColor: 'rgb(249, 250, 251)',
		overflow: 'hidden !important',
		borderTop: '1px solid rgba(34,36,38,.1)',
		borderBottom: '1px solid rgba(34,36,38,.1)'
	},
	bottomLeftGrid: {
		backgroundColor: 'rgb(249, 250, 251)',
		overflow: 'hidden !important'
	}
});

export function PerformanceGrid ({
	classes,
	performanceData
}) {
	return (
		<div className={classes.performanceGrid}>
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
											<div className={classes.cell} key={key} style={style}>
												{isNumber ? <Amount value={parseValue} /> : value}
											</div>
										);
									}}
									columnWidth={columnWidth}
									columnCount={performanceData[0].length}
									enableFixedColumnScroll
									enableFixedRowScroll
									width={adjustedWidth}
									height={ROW_HEIGHT * performanceData.length + 10}
									rowHeight={ROW_HEIGHT}
									rowCount={performanceData.length}
									classNameTopLeftGrid={classes.topLeftGrid}
									classNameBottomLeftGrid={classes.bottomLeftGrid}
									classNameTopRightGrid={classes.topRightGrid}
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
	classes: PropTypes.object.isRequired,
	performanceData: PropTypes.array.isRequired
};

export default withStyles(styles)(PerformanceGrid);