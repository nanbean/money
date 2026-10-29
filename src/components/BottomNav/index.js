import React from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import MenuIcon from '@mui/icons-material/Menu';

import { toggleSidebar } from '../../actions/uiActions';
import useMobile from '../../hooks/useMobile';
import useT from '../../hooks/useT';

// Mobile-only bottom navigation. Renders nothing on desktop where the
// sidebar is always visible. Five slots: four primary destinations + a
// "More" button that opens the existing drawer for the remaining links
// (Net worth, Lifetime, Search, Thesis, Settings, etc.).
//
// 화면 가장자리에서 떠 있는 캡슐형이다(토스 하단 탭과 같은 형태). 반투명 배경에
// 블러를 걸어 뒤 콘텐츠가 비치고, 선택된 탭에만 알약 배경을 깐다.
const NAV_HEIGHT = 64;
const NAV_GAP = 10; // 캡슐 아래·좌우 띄움
// 캡슐이 차지하는 아래 높이(+12px 숨 쉴 틈). 본문의 아래 여백과, 캡슐 위에 띄울
// 요소(토스트 등)의 bottom 으로 쓴다.
export const BOTTOM_NAV_SPACE = `calc(${NAV_HEIGHT + NAV_GAP + 12}px + env(safe-area-inset-bottom))`;

const NAV_ITEMS = [
	{ path: '/', exact: true, en: 'Home', ko: '홈', Icon: HomeOutlinedIcon },
	{ path: '/investments', en: 'Invest', ko: '투자', Icon: TrendingUpOutlinedIcon },
	{ path: '/spending', en: 'Spend', ko: '지출', Icon: ReceiptLongOutlinedIcon },
	{ path: '/report', en: 'Reports', ko: '리포트', Icon: PieChartOutlineIcon }
];

const isActive = (item, pathname) => {
	if (item.exact) return pathname === item.path;
	return pathname === item.path || pathname.startsWith(`${item.path}/`);
};

function BottomNav () {
	const isMobile = useMobile();
	const dispatch = useDispatch();
	const location = useLocation();
	const T = useT();

	if (!isMobile) return null;

	const itemSx = (active) => ({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '3px',
		flex: 1,
		minWidth: 0,
		borderRadius: `${(NAV_HEIGHT - 12) / 2}px`,
		textDecoration: 'none',
		background: active ? (T.dark ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.07)') : 'transparent',
		border: 'none',
		fontFamily: 'inherit',
		cursor: 'pointer',
		padding: 0,
		color: active ? T.ink : T.ink2,
		transition: 'background 0.2s, color 0.15s',
		WebkitTapHighlightColor: 'transparent'
	});

	const labelSx = (active) => ({ fontSize: 11, fontWeight: active ? 700 : 500, lineHeight: 1 });

	return (
		<Box sx={{
			position: 'fixed',
			left: NAV_GAP,
			right: NAV_GAP,
			bottom: `calc(${NAV_GAP}px + env(safe-area-inset-bottom))`,
			zIndex: 1100,
			marginX: 'auto',
			maxWidth: 480,
			height: NAV_HEIGHT,
			padding: '6px',
			display: 'flex',
			borderRadius: `${NAV_HEIGHT / 2}px`,
			background: T.dark ? 'rgba(38,38,44,0.72)' : 'rgba(255,255,255,0.78)',
			backdropFilter: 'blur(20px) saturate(180%)',
			WebkitBackdropFilter: 'blur(20px) saturate(180%)',
			border: `1px solid ${T.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}`,
			boxShadow: T.dark ? '0 8px 28px rgba(0,0,0,0.45)' : '0 8px 28px rgba(15,23,42,0.14)'
		}}>
			{NAV_ITEMS.map(item => {
				const active = isActive(item, location.pathname);
				const { Icon } = item;
				return (
					<Box key={item.path} component={Link} to={item.path} sx={itemSx(active)}>
						<Icon sx={{ fontSize: 23 }}/>
						<Typography sx={labelSx(active)}>{item.ko}</Typography>
					</Box>
				);
			})}
			<Box component="button" type="button" onClick={() => dispatch(toggleSidebar())} sx={itemSx(false)}>
				<MenuIcon sx={{ fontSize: 23 }}/>
				<Typography sx={labelSx(false)}>더보기</Typography>
			</Box>
		</Box>
	);
}

export default BottomNav;
