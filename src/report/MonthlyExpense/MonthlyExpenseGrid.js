import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Amount from '../../components/Amount';
import useT from '../../hooks/useT';

const FIRST_COL_WIDTH = 140;
const OTHER_COL_MIN_WIDTH = 94;
const ROW_HEIGHT = 45;

const buildSearchPath = (item) => {
	if (item.startDate && item.endDate && item.category) {
		if (item.category.includes(':')) {
			const [parent, child] = item.category.split(':');
			return `/search?startDate=${item.startDate}&endDate=${item.endDate}&category=${encodeURIComponent(parent)}&subcategory=${encodeURIComponent(child)}`;
		}
		return `/search?startDate=${item.startDate}&endDate=${item.endDate}&category=${encodeURIComponent(item.category)}`;
	}
	if (item.startDate && item.endDate) {
		return `/search?startDate=${item.startDate}&endDate=${item.endDate}`;
	}
	return null;
};

const renderCellContent = (item) => {
	if (item.type === 'label') {
		return <Typography variant="body2">{item.value}</Typography>;
	}
	if (typeof item.value === 'string' && item.value.includes('%')) {
		return <Typography variant="body2">{item.value}</Typography>;
	}
	if (typeof item.value === 'number') {
		return <Amount value={item.value} />;
	}
	return <Typography variant="body2">{item.value === null || item.value === undefined ? '' : String(item.value)}</Typography>;
};

/**
 * MonthlyExpense report grid.
 * - Categories on rows × months on columns.
 * - Cells carry { startDate, endDate, category } so clicking a row drills
 *   into the Search page filtered by that period and category.
 * - cellColor=true marks emphasized rows (e.g., totals).
 */
export function MonthlyExpenseGrid ({ reportData }) {
	const navigate = useNavigate();
	const T = useT();

	if (!reportData || reportData.length === 0) return null;

	const columnCount = reportData[0].length;
	const headerRow = reportData[0];
	const bodyRows = reportData.slice(1);

	// Pre-mixed opaque tint — sticky cells stay put while others scroll under
	// them, so a translucent fill would bleed through.
	const cellColorBg = T.dark ? '#1f1f28' : '#ededea';
	const surfaceBg = T.surf;
	const hoverBg = T.surf2;
	const ruleColor = T.rule;

	const cellSx = ({ item, isHeader, isFirstCol, clickable }) => {
		const bg = item.cellColor ? cellColorBg : surfaceBg;
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
			boxSizing: 'border-box',
			cursor: clickable ? 'pointer' : 'default'
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
		if (clickable) {
			sx['&:hover'] = { background: hoverBg };
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
						{headerRow.map((item, colIdx) => {
							const isFirstCol = colIdx === 0;
							const path = buildSearchPath(item);
							const handleClick = path ? () => navigate(path) : undefined;
							return (
								<Box
									component="th"
									key={colIdx}
									onClick={handleClick}
									sx={cellSx({ item, isHeader: true, isFirstCol, clickable: !!path })}
								>
									{renderCellContent(item)}
								</Box>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{bodyRows.map((row, rowIdx) => (
						<tr key={rowIdx}>
							{row.map((item, colIdx) => {
								const isFirstCol = colIdx === 0;
								const path = buildSearchPath(item);
								const handleClick = path ? () => navigate(path) : undefined;
								return (
									<Box
										component="td"
										key={colIdx}
										onClick={handleClick}
										sx={cellSx({ item, isHeader: false, isFirstCol, clickable: !!path })}
									>
										{renderCellContent(item)}
									</Box>
								);
							})}
						</tr>
					))}
				</tbody>
			</Box>
		</Box>
	);
}

MonthlyExpenseGrid.propTypes = {
	reportData: PropTypes.array.isRequired
};

export default MonthlyExpenseGrid;
