import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, MultiGrid } from 'react-virtualized';

import { toCurrencyFormat } from '../../utils/formatting';

import 'react-virtualized/styles.css'; // only needs to be imported once
import './index.css';

const ROW_HEIGHT = 40;
const COLUMN_WIDTH = 84;

class ReportGrid extends Component {
	render () {
		const { reportData } = this.props;

		return (
			<div className="report-grid">
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
										<div className="cell" key={key} style={style}>
											{isNumber ? toCurrencyFormat(parseValue) : value}
										</div>
									);
								}}
								columnWidth={COLUMN_WIDTH}
								columnCount={reportData[0].length}
								enableFixedColumnScroll
								enableFixedRowScroll
								width={width}
								height={height}
								rowHeight={ROW_HEIGHT}
								rowCount={reportData.length}
								classNameTopLeftGrid="top-left-grid"
								classNameBottomLeftGrid="bottom-left-grid"
								classNameTopRightGrid="top-right-grid"
							/>
						)}
					</AutoSizer>
				}
			</div>
		);
	}
}

ReportGrid.propTypes = {
	reportData: PropTypes.array
};

export default ReportGrid;
