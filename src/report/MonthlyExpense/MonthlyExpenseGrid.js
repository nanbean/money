import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Amount from '../../components/Amount';
import useT from '../../hooks/useT';
import { resolveCategoryColor } from '../../utils/categoryColor';

// 왼쪽 정렬 + 들여쓰기 + '└ ' 마커가 붙어도 가장 긴 하위 라벨('도로비&주차비')이
// 잘리지 않을 만큼만 넓혔다.
// 상단 차트가 월 열과 정렬되도록 index.js 가 이 값을 함께 쓴다.
export const FIRST_COL_WIDTH = 140;

// 첫 열 뒤에 오는 열 개수 — 1~12월 + Total.
export const VALUE_COLUMN_COUNT = 13;
// 상위 행은 왼쪽 끝에, 자식 행은 이만큼 안쪽에서 시작한다.
const CHILD_INDENT = 10;
// 모바일에서만 쓰는 최소 폭. 데스크톱은 tableLayout: fixed + width 100% 로
// 컨테이너에 맞춰 13개 열(1~12월 + Total)이 균등 분할된다.
//
// 고정 폭으로는 화면 크기마다 넘쳤다. 사이드바 240px + 패딩 100px 을 빼면
// 1440 화면의 가용 폭이 1,100px 인데, 전체 자릿수(약 94px/열)는 1,372px 이 필요했다.
// 금액을 만/억 단위로 축약(Amount compact)해 좁힌 뒤 남는 폭을 균등 분배한다.
const OTHER_COL_MIN_WIDTH = 82;
const ROW_HEIGHT = 45;

// 기간이 붙은 셀만 드릴다운할 수 있다. 카테고리는 없어도 되고(월 헤더),
// 있으면 그 카테고리로 좁힌다.
const isDrillable = (item) => !!(item.startDate && item.endDate);

const renderCellContent = (item) => {
	if (item.type === 'label') {
		return <Typography variant="body2">{item.value}</Typography>;
	}
	if (typeof item.value === 'string' && item.value.includes('%')) {
		return <Typography variant="body2">{item.value}</Typography>;
	}
	if (typeof item.value === 'number') {
		// 만/억 축약. 전체 자릿수로는 13개 열이 한 화면에 들어가지 않는다.
		return <Amount value={item.value} compact />;
	}
	return <Typography variant="body2">{item.value === null || item.value === undefined ? '' : String(item.value)}</Typography>;
};

/**
 * MonthlyExpense report grid.
 * - Categories on rows × months on columns.
 * - Parent category rows are group headers (bold, no tint); the tinted rows at the
 *   end of each section are the section totals. Headers read top-down, totals
 *   bottom-up, so the two do not compete.
 * - Cells carry { startDate, endDate, category, kind } so clicking one drills
 *   into that period and category. onCellClick opens a dialog in place — it
 *   used to navigate to the Search page, which lost the report you were reading.
 * - cellColor=true marks emphasized rows (e.g., totals).
 */
export function MonthlyExpenseGrid ({ reportData, onCellClick }) {
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
			<Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
				<Box sx={{ width: 8, height: 8, borderRadius: '2px', background: color, flexShrink: 0 }}/>
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
			// 데스크톱은 minWidth 를 풀어야 컨테이너 폭에 맞게 균등 분할된다.
			// 모바일은 좁아서 13개 열을 다 보여줄 수 없으므로 최소 폭 + 가로 스크롤.
			minWidth: isFirstCol ? FIRST_COL_WIDTH : { xs: OTHER_COL_MIN_WIDTH, md: 0 },
			width: isFirstCol ? FIRST_COL_WIDTH : 'auto',
			// 카테고리 열은 왼쪽 정렬. 라벨 길이가 달라도 왼쪽 끝이 가지런해 스캔하기
			// 쉽고, 하위 행의 '└' 마커가 상위 행과 이어져 보인다. 금액 열은 가운데.
			// 금액 열 좌우 패딩은 4px — 열이 좁아 8px 이면 축약 금액도 잘린다.
			padding: isFirstCol ? `0 8px 0 ${8 + (item.indent ? CHILD_INDENT : 0)}px` : '0 4px',
			textAlign: isFirstCol ? 'left' : 'center',
			verticalAlign: 'middle',
			color: T.ink,
			// groupHeader 는 상위 카테고리 머리글용. 음영(cellColor)은 섹션 총계에만 쓴다.
			fontWeight: (isHeader || item.groupHeader) ? 600 : 400,
			boxSizing: 'border-box',
			cursor: clickable ? 'pointer' : 'default',
			// Keep long amounts on a single line; the inner Typography also
			// has nowrap/ellipsis but we belt-and-brace at the cell level.
			overflow: 'hidden',
			whiteSpace: 'nowrap'
		};
		// 모든 행에 borderBottom 이 있어 rule 색으로는 구분이 안 된다. 그룹 머리글
		// 위쪽만 진한 선을 둬서 경계가 보이게 한다.
		if (item.groupHeader) {
			sx.borderTop = `1px solid ${T.ink3}`;
		}
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
				// fixed 로 두면 첫 열만 고정 폭을 쓰고 나머지 12개월+Total 이 남은 폭을
				// 균등 분할한다 — 화면 크기에 상관없이 한 화면에 들어간다.
				tableLayout: 'fixed',
				minWidth: { xs: FIRST_COL_WIDTH + (columnCount - 1) * OTHER_COL_MIN_WIDTH, md: 0 }
			}}>
				<thead>
					<tr>
						{headerRow.map((item, colIdx) => {
							const isFirstCol = colIdx === 0;
							const drillable = isDrillable(item);
							const handleClick = drillable ? () => onCellClick(item) : undefined;
							return (
								<Box
									component="th"
									key={colIdx}
									onClick={handleClick}
									sx={cellSx({ item, isHeader: true, isFirstCol, clickable: drillable })}
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
								const drillable = isDrillable(item);
								const handleClick = drillable ? () => onCellClick(item) : undefined;
								const renderedContent = isFirstCol && item.type === 'label'
									? renderLabelWithDot(item)
									: renderCellContent(item);
								return (
									<Box
										component="td"
										key={colIdx}
										onClick={handleClick}
										sx={cellSx({ item, isHeader: false, isFirstCol, clickable: drillable })}
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
	onCellClick: PropTypes.func.isRequired,
	reportData: PropTypes.array.isRequired
};

export default MonthlyExpenseGrid;
