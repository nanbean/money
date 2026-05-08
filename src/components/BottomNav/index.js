import React from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import MenuIcon from '@mui/icons-material/Menu';

import { toggleSidebar } from '../../actions/uiActions';
import useMobile from '../../hooks/useMobile';
import useT from '../../hooks/useT';

// Mobile-only fixed bottom navigation. Renders nothing on desktop where the
// sidebar is always visible. Five slots: four primary destinations + a
// "More" button that opens the existing drawer for the remaining links
// (Net worth, Lifetime, Search, Thesis, Settings, etc.).
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
		flex: 1,
		textDecoration: 'none',
		background: 'transparent',
		border: 'none',
		fontFamily: 'inherit',
		cursor: 'pointer',
		padding: 0,
		color: active ? T.acc.hero : T.ink2,
		transition: 'color 0.15s'
	});

	return (
		<Box sx={{
			position: 'fixed',
			bottom: 0,
			left: 0,
			right: 0,
			zIndex: 1100,
			background: T.surf,
			borderTop: `1px solid ${T.rule}`,
			boxShadow: T.dark ? '0 -2px 8px rgba(0,0,0,0.4)' : '0 -2px 8px rgba(15,23,42,0.06)',
			paddingBottom: 'env(safe-area-inset-bottom)'
		}}>
			<Stack direction="row" sx={{ height: 56 }}>
				{NAV_ITEMS.map(item => {
					const active = isActive(item, location.pathname);
					const { Icon } = item;
					return (
						<Box key={item.path} component={Link} to={item.path} sx={itemSx(active)}>
							<Icon sx={{ fontSize: 22 }}/>
							<Typography sx={{ fontSize: 10, fontWeight: active ? 700 : 500, marginTop: '2px' }}>
								{item.ko}
							</Typography>
						</Box>
					);
				})}
				<Box component="button" type="button" onClick={() => dispatch(toggleSidebar())} sx={itemSx(false)}>
					<MenuIcon sx={{ fontSize: 22 }}/>
					<Typography sx={{ fontSize: 10, fontWeight: 500, marginTop: '2px' }}>더보기</Typography>
				</Box>
			</Stack>
		</Box>
	);
}

export default BottomNav;
