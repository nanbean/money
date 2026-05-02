import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Amount from '../../components/Amount';
import useT from '../../hooks/useT';

const FIRST_COL_WIDTH = 110;
const OTHER_COL_MIN_WIDTH = 130;
const ROW_HEIGHT = 45;

const COLUMNS = [
	{ key: 'year',                 label: 'Year',           type: 'label' },
	{ key: 'netWorth',             label: 'Net Worth',      type: 'currency' },
	{ key: 'cashBalance',          label: 'Cash',           type: 'currency' },
	{ key: 'investmentBalance',    label: 'Investment',     type: 'currency' },
	{ key: 'depositWithdrawalSum', label: 'Cash Flow',      type: 'currency' },
	{ key: 'returnRate',           label: 'Rate of Return', type: 'percent' }
];

/**
 * Yearly snapshot table for the Rate of Return report.
 * - One row per year (data already aggregated by useReturnReport).
 * - First column (Year) is sticky-left so the user can compare across columns
 *   while scrolling horizontally on narrow screens.
 * - Header row is sticky-top.
 */
export function ReturnYearlyTable ({ rows }) {
	const T = useT();

	if (!rows || rows.length === 0) return null;

	const surfaceBg = T.surf;
	const ruleColor = T.rule;

	const cellSx = ({ isHeader, isFirstCol }) => {
		const sx = {
			background: surfaceBg,
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

	const renderCell = (col, row) => {
		if (col.key === 'year') {
			return <Typography variant="body2">{row.date?.substring(0, 4) ?? ''}</Typography>;
		}
		if (col.type === 'percent') {
			const rate = row[col.key];
			if (rate === null || rate === undefined || Number.isNaN(rate)) {
				return <Typography variant="body2">{''}</Typography>;
			}
			return <Typography variant="body2">{`${(rate * 100).toFixed(3)}%`}</Typography>;
		}
		const value = row[col.key];
		if (typeof value !== 'number' || Number.isNaN(value)) {
			return <Typography variant="body2">{''}</Typography>;
		}
		return <Amount value={value} />;
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
				minWidth: FIRST_COL_WIDTH + (COLUMNS.length - 1) * OTHER_COL_MIN_WIDTH
			}}>
				<thead>
					<tr>
						{COLUMNS.map((col, colIdx) => (
							<Box
								component="th"
								key={col.key}
								sx={cellSx({ isHeader: true, isFirstCol: colIdx === 0 })}
							>
								<Typography variant="body2" sx={{ fontWeight: 600 }}>{col.label}</Typography>
							</Box>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIdx) => (
						<tr key={row.date || rowIdx}>
							{COLUMNS.map((col, colIdx) => (
								<Box
									component="td"
									key={col.key}
									sx={cellSx({ isHeader: false, isFirstCol: colIdx === 0 })}
								>
									{renderCell(col, row)}
								</Box>
							))}
						</tr>
					))}
				</tbody>
			</Box>
		</Box>
	);
}

ReturnYearlyTable.propTypes = {
	rows: PropTypes.arrayOf(PropTypes.shape({
		date: PropTypes.string,
		netWorth: PropTypes.number,
		cashBalance: PropTypes.number,
		investmentBalance: PropTypes.number,
		depositWithdrawalSum: PropTypes.number,
		returnRate: PropTypes.number
	})).isRequired
};

export default ReturnYearlyTable;
