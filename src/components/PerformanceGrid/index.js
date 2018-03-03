import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, MultiGrid } from 'react-virtualized';

import { toCurrencyFormat } from '../../utils/formatting';

import 'react-virtualized/styles.css'; // only needs to be imported once
import './index.css';

const ROW_HEIGHT = 60;
const COLUMN_WIDTH = 100;

class PerformanceGrid extends Component {
	render () {
		const { isMobile, performanceData } = this.props;

		return (
			<div className='performance-grid'>
				{
					<AutoSizer disableHeight>
						{({width}) => (
							<MultiGrid
								fixedRowCount={1}
								fixedColumnCount={1}
								cellRenderer={({columnIndex, key, rowIndex, style}) => {
									const value = performanceData[rowIndex][columnIndex];
									const parseValue = parseInt(value, 10);
									const isNumber = !Number.isNaN(parseValue);

									return (
										<div className={`cell${isNumber ? (parseValue < 0 ? ' negative' : ' neutal') : ''}`} key={key} style={style}>
											{isNumber ? toCurrencyFormat(parseValue) : value}
										</div>
									);
								}}
								columnWidth={isMobile ? COLUMN_WIDTH : width / performanceData[0].length}
								columnCount={performanceData[0].length}
								enableFixedColumnScroll
								enableFixedRowScroll
								width={width}
								height={ROW_HEIGHT * performanceData.length + 10}
								rowHeight={ROW_HEIGHT}
								rowCount={performanceData.length}
								classNameTopLeftGrid='top-left-grid'
								classNameBottomLeftGrid='bottom-left-grid'
								classNameTopRightGrid='top-right-grid'
							/>
						)}
					</AutoSizer>
				}
			</div>
		)
	}
}

PerformanceGrid.propTypes = {
	isMobile: PropTypes.bool,
	reportData: PropTypes.array
};

export default PerformanceGrid;
