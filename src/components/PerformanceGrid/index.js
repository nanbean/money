import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, ColumnSizer, MultiGrid } from 'react-virtualized';

import { toCurrencyFormat } from '../../utils/formatting';

import 'react-virtualized/styles.css'; // only needs to be imported once
import './index.css';

const ROW_HEIGHT = 60;
const COLUMN_MIN_WIDTH = 100;

class PerformanceGrid extends Component {
	render () {
		const { performanceData } = this.props;

		return (
			<div className='performance-grid'>
				{
					<AutoSizer disableHeight>
						{({width}) => (
							<ColumnSizer
								columnMinWidth={COLUMN_MIN_WIDTH}
								columnCount={performanceData[0].length}
								key="GridColumnSizer"
								width={width}>
								{({adjustedWidth, columnWidth, registerChild}) => (
									<MultiGrid
										ref={registerChild}
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
										columnWidth={columnWidth}
										columnCount={performanceData[0].length}
										enableFixedColumnScroll
										enableFixedRowScroll
										width={adjustedWidth}
										height={ROW_HEIGHT * performanceData.length + 10}
										rowHeight={ROW_HEIGHT}
										rowCount={performanceData.length}
										classNameTopLeftGrid='top-left-grid'
										classNameBottomLeftGrid='bottom-left-grid'
										classNameTopRightGrid='top-right-grid'
									/>
								)}
							</ColumnSizer>
						)}
					</AutoSizer>
				}
			</div>
		);
	}
}

PerformanceGrid.propTypes = {
	performanceData: PropTypes.array
};

export default PerformanceGrid;
