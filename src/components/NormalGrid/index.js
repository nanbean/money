import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Amount from '../Amount';
import Quantity from '../Quantity';
import useT from '../../hooks/useT';

const FIRST_COL_WIDTH = 140;
const OTHER_COL_MIN_WIDTH = 100;
const ROW_HEIGHT = 60;

const renderCell = (item) => {
	if (!item) return null;
	const { type, currency, value, showOriginal } = item;

	if (type === 'label') {
		return <Typography variant="body2">{value}</Typography>;
	}
	if (type === 'currency') {
		return <Amount value={value} negativeColor showSymbol currency={currency} />;
	}
	if (type === 'noColorCurrency') {
		return <Amount value={value} showColor={false} showOriginal={showOriginal} showSymbol currency={currency} />;
	}
	if (type === 'quantity') {
		return <Quantity value={value} />;
	}
	if (typeof value === 'string' && value.includes('%')) {
		return <Typography variant="body2">{value}</Typography>;
	}
	const parsed = parseInt(value, 10);
	if (!Number.isNaN(parsed) && value !== null && value !== undefined && value !== '') {
		return <Amount value={parsed} showColor={false} />;
	}
	return <Typography variant="body2">{value == null ? '' : String(value)}</Typography>;
};

/**
 * Generic 2D data grid used by report tables (e.g., Dividend).
 * - First row sticky-top, first column sticky-left, corner sticky-both.
 * - Native <table> + position:sticky (no virtualization). iOS scrolls cleanly.
 */
export function NormalGrid ({ gridData }) {
	const T = useT();

	if (!gridData || gridData.length === 0) return null;

	const columnCount = gridData[0].length;
	const headerRow = gridData[0];
	const bodyRows = gridData.slice(1);

	const cellColorBg = T.dark ? '#1f1f28' : '#ededea';
	const surfaceBg = T.surf;
	const ruleColor = T.rule;

	const cellSx = ({ item, isHeader, isFirstCol }) => {
		const bg = (item && item.cellColor) ? cellColorBg : surfaceBg;
		const sx = {
			background: bg,
			borderBottom: `1px solid ${ruleColor}`,
			height: ROW_HEIGHT,
			minWidth: isFirstCol ? FIRST_COL_WIDTH : OTHER_COL_MIN_WIDTH,
			width: isFirstCol ? FIRST_COL_WIDTH : 'auto',
			padding: '0 8px',
			textAlign: 'center',
			verticalAlign: 'middle',
			color: T.ink,
			fontWeight: isHeader ? 600 : 400,
			boxSizing: 'border-box'
		};
		if (isHeader && isFirstCol) {
			sx.position = 'sticky';
			sx.top = 0;
			sx.left = 0;
			sx.zIndex = 3;
		} else if (isHeader) {
			sx.position = 'sticky';
			sx.top = 0;
			sx.zIndex = 2;
		} else if (isFirstCol) {
			sx.position = 'sticky';
			sx.left = 0;
			sx.zIndex = 1;
		}
		return sx;
	};

	return (
		<Box sx={{
			width: '100%',
			minWidth: 0,
			maxHeight: '100%',
			overflow: 'auto',
			WebkitOverflowScrolling: 'touch',
			overscrollBehavior: 'contain',
			scrollbarWidth: 'thin',
			scrollbarColor: 'rgba(128, 128, 128, 0.3) transparent',
			'&::-webkit-scrollbar': { width: 8, height: 8 },
			'&::-webkit-scrollbar-track': { background: 'transparent' },
			'&::-webkit-scrollbar-thumb': {
				background: 'rgba(128, 128, 128, 0.28)',
				borderRadius: '4px',
				border: '2px solid transparent',
				backgroundClip: 'content-box'
			},
			'&::-webkit-scrollbar-thumb:hover': {
				background: 'rgba(128, 128, 128, 0.55)',
				backgroundClip: 'content-box'
			},
			'&::-webkit-scrollbar-corner': { background: 'transparent' }
		}}>
			<Box component="table" sx={{
				borderCollapse: 'separate',
				borderSpacing: 0,
				width: '100%',
				minWidth: FIRST_COL_WIDTH + (columnCount - 1) * OTHER_COL_MIN_WIDTH
			}}>
				<thead>
					<tr>
						{headerRow.map((item, colIdx) => (
							<Box
								component="th"
								key={colIdx}
								sx={cellSx({ item, isHeader: true, isFirstCol: colIdx === 0 })}
							>
								{renderCell(item)}
							</Box>
						))}
					</tr>
				</thead>
				<tbody>
					{bodyRows.map((row, rowIdx) => (
						<tr key={rowIdx}>
							{row.map((item, colIdx) => (
								<Box
									component="td"
									key={colIdx}
									sx={cellSx({ item, isHeader: false, isFirstCol: colIdx === 0 })}
								>
									{renderCell(item)}
								</Box>
							))}
						</tr>
					))}
				</tbody>
			</Box>
		</Box>
	);
}

NormalGrid.propTypes = {
	gridData: PropTypes.array
};

export default NormalGrid;
