import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';
import { AutoSizer, MultiGrid } from 'react-virtualized';
import _ from 'lodash';

import { toCurrencyFormat } from '../../utils/formatting';

import 'react-virtualized/styles.css'; // only needs to be imported once

const ROW_HEIGHT = 40;
const COLUMN_WIDTH = 84;

const styles = theme => ({
	reportGrid: {
		display: 'flex',
		height: '65vh',
		fontSize: '.9em',
		textAlign: 'center',
		[theme.breakpoints.down('sm')]: {
			height: '80vh',
			fontSize: '.8em'
		}
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

class ReportGrid extends Component {
	shouldComponentUpdate (nextProps) {
		if (_.isEqual(this.props.reportData, nextProps.reportData)) {
			return false;
		}

		return true;
	}

	render () {
		const { classes, reportData, width } = this.props;
		const isWidthUpLg = isWidthUp('lg', width);

		return (
			<div className={classes.reportGrid}>
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
										<div className={classes.cell} key={key} style={style}>
											{isNumber ? toCurrencyFormat(parseValue) : value}
										</div>
									);
								}}
								columnWidth={isWidthUpLg ? width / 14 - 2 : COLUMN_WIDTH}
								columnCount={reportData[0].length}
								enableFixedColumnScroll
								enableFixedRowScroll
								width={width}
								height={height}
								rowHeight={ROW_HEIGHT}
								rowCount={reportData.length}
								classNameTopLeftGrid={classes.topLeftGrid}
								classNameBottomLeftGrid={classes.bottomLeftGrid}
								classNameTopRightGrid={classes.topRightGrid}
							/>
						)}
					</AutoSizer>
				}
			</div>
		);
	}
}

ReportGrid.propTypes = {
	classes: PropTypes.object.isRequired,
	reportData: PropTypes.array.isRequired,
	width: PropTypes.object.isRequired
};

export default withStyles(styles, { withTheme: true })(withWidth()(ReportGrid));
