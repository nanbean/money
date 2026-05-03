import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Amount from '../../components/Amount';
import useT from '../../hooks/useT';
import { resolveCategoryColor } from '../../utils/categoryColor';

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
		// Show the display currency symbol — same convention as NormalGrid /
		// AccountInvestments / Holdings tables.
		return <Amount value={item.value} showSymbol />;
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
	const { categoryColors = {} } = useSelector((state) => state.settings || {});

	if (!reportData || reportData.length === 0) return null;

	// First-column label rows carry the category — render a small color dot
	// next to the name so the same category is identifiable in this grid as
	// in Recent activity / Spending / Search.
	const renderLabelWithDot = (item) => {
		if (!item.category) {
			return <Typography variant="body2">{item.value}</Typography>;
		}
		const baseCat = item.category.split(':')[0] || item.category;
		const color = resolveCategoryColor(item.category, categoryColors[baseCat]);
		return (
			<Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, justifyContent: 'center' }}>
				<Box sx={{ width: 6, height: 6, borderRadius: '2px', background: color, flexShrink: 0 }}/>
				<Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
					{item.value}
				</Typography>
			</Stack>
		);
	};

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
			cursor: clickable ? 'pointer' : 'default',
			// Keep long amounts on a single line; the inner Typography also
			// has nowrap/ellipsis but we belt-and-brace at the cell level.
			overflow: 'hidden',
			whiteSpace: 'nowrap'
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
								const renderedContent = isFirstCol && item.type === 'label'
									? renderLabelWithDot(item)
									: renderCellContent(item);
								return (
									<Box
										component="td"
										key={colIdx}
										onClick={handleClick}
										sx={cellSx({ item, isHeader: false, isFirstCol, clickable: !!path })}
									>
										{renderedContent}
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
