import { useDispatch, useSelector } from 'react-redux';
import { useLocation, Link } from 'react-router-dom';

import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import OutlinedFlagIcon from '@mui/icons-material/OutlinedFlag';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';

import { toggleSidebar } from '../../actions/uiActions';
import { logoutAction } from '../../actions/authActions';

import useMobile from '../../hooks/useMobile';
import useT from '../../hooks/useT';
import { sDisplay } from '../../utils/designTokens';

const drawerWidth = 240;

const navItems = [
	{ path: '/', exact: true, en: 'Home', ko: '홈', Icon: HomeOutlinedIcon },
	{ path: '/accounts', en: 'Accounts', ko: '계좌', Icon: CreditCardOutlinedIcon },
	{ path: '/investments', en: 'Investments', ko: '투자', Icon: TrendingUpOutlinedIcon },
	{ path: '/report', en: 'Reports', ko: '리포트', Icon: PieChartOutlineIcon },
	{ path: '/networth', en: 'Net worth', ko: '순자산', Icon: AccountBalanceOutlinedIcon },
	{ path: '/lifetimeplanner', en: 'Lifetime', ko: '평생계획', Icon: OutlinedFlagIcon },
	{ path: '/search', en: 'Search', ko: '검색', Icon: SearchOutlinedIcon },
	{ path: '/setting', en: 'Settings', ko: '설정', Icon: SettingsOutlinedIcon }
];

const isActive = (item, pathname) => {
	if (item.exact) return pathname === item.path;
	return pathname === item.path || pathname.startsWith(`${item.path}/`);
};

// Active state per design: translucent accent tint + accent hero text/icon, follows current accent.
function NavItem ({ item, active, onClick, T }) {
	const { Icon } = item;
	const activeBg = T.acc.bg;
	const activeFg = T.acc.deep;
	return (
		<Link to={item.path} onClick={onClick} style={{ textDecoration: 'none', color: 'inherit' }}>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					padding: '10px 12px',
					borderRadius: '10px',
					cursor: 'pointer',
					background: active ? activeBg : 'transparent',
					color: active ? activeFg : T.ink,
					transition: 'background 0.12s, color 0.12s',
					'&:hover': {
						background: active ? activeBg : T.surf2
					}
				}}
			>
				<Icon
					sx={{
						fontSize: 18,
						color: active ? activeFg : T.ink2,
						flexShrink: 0
					}}
				/>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography
						sx={{
							fontSize: 13,
							fontWeight: active ? 700 : 500,
							color: active ? activeFg : T.ink,
							lineHeight: 1.2
						}}
					>
						{item.en}
					</Typography>
					<Typography
						sx={{
							fontSize: 10,
							color: active ? activeFg : T.ink2,
							opacity: active ? 0.7 : 1,
							marginTop: '1px',
							lineHeight: 1
						}}
					>
						{item.ko}
					</Typography>
				</Box>
			</Box>
		</Link>
	);
}

function SidebarMenu () {
	const username = useSelector((state) => state.username);
	const isSidebarOpen = useSelector((state) => state.ui.isSidebarOpen);
	const settings = useSelector((state) => state.settings || {});
	const dispatch = useDispatch();
	const isMobile = useMobile();
	const location = useLocation();
	const T = useT();

	const onNavClick = () => {
		if (isMobile) dispatch(toggleSidebar());
	};
	const onSignout = () => dispatch(logoutAction());

	const fxLabel = settings.exchangeRate
		? `USD/KRW ${Number(settings.exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
		: '';

	const initials = (username || 'OE')
		.toString()
		.split(/\s+/)
		.map(s => s[0])
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase();

	return (
		<Drawer
			variant="permanent"
			PaperProps={{
				style: {
					// Dark: #0c0c12 (subtle pop above bg #0a0a0f)
					// Light: match the warm-cream page bg so the sidebar feels flush, not a cool-white block
					background: T.dark ? '#0c0c12' : T.bg,
					color: T.ink,
					borderRight: `1px solid ${T.rule}`,
					backgroundImage: 'none'
				}
			}}
			sx={(theme) => ({
				position: 'relative',
				boxSizing: 'border-box',
				width: drawerWidth,
				flexShrink: 0,
				whiteSpace: 'nowrap',
				[theme.breakpoints.down('sm')]: { width: isSidebarOpen ? drawerWidth : 0 },
				'& .MuiDrawer-paper': {
					width: drawerWidth,
					overflowX: 'hidden',
					[theme.breakpoints.down('sm')]: { width: isSidebarOpen ? drawerWidth : 0 }
				}
			})}
			open={isSidebarOpen}
		>
			<Box sx={{ height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '22px 14px' }}>
				{/* Brand */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						minHeight: 36,
						padding: '4px 8px 22px',
						borderBottom: `1px solid ${T.rule}`,
						marginBottom: '16px'
					}}
				>
					<span
						style={{
							fontFamily: '"Space Grotesk","Pretendard",system-ui,-apple-system,sans-serif',
							letterSpacing: '-0.03em',
							fontWeight: 800,
							fontSize: 22,
							color: T.ink,
							lineHeight: 1
						}}
					>
						money<span style={{ color: T.acc.bright }}>.</span>
					</span>
				</Box>

				{/* Nav */}
				<Stack spacing="2px" sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					{navItems.map(item => (
						<NavItem
							key={item.path}
							item={item}
							active={isActive(item, location.pathname)}
							onClick={onNavClick}
							T={T}
						/>
					))}
				</Stack>

				{/* Footer: user info inline */}
				<Box
					sx={{
						marginTop: 'auto',
						padding: '12px',
						borderTop: `1px solid ${T.rule}`,
						display: 'flex',
						alignItems: 'center',
						gap: 1.25
					}}
				>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: '16px',
							background: T.acc.hero,
							color: '#fff',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							...sDisplay,
							fontSize: 12,
							fontWeight: 700,
							flexShrink: 0
						}}
					>
						{initials}
					</Box>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						{username && (
							<Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>
								{username}
							</Typography>
						)}
						{fxLabel && (
							<Typography sx={{ fontSize: 10, color: T.ink2, lineHeight: 1.3 }}>{fxLabel}</Typography>
						)}
					</Box>
					{username ? (
						<Tooltip title="Sign out" placement="top">
							<IconButton
								size="small"
								onClick={onSignout}
								sx={{ color: T.ink2, padding: '4px', '&:hover': { color: T.acc.hero, background: 'transparent' } }}
							>
								<LogoutOutlinedIcon sx={{ fontSize: 14 }} />
							</IconButton>
						</Tooltip>
					) : (
						<Tooltip title="Sign in" placement="top">
							<Link to="/signin" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}>
								<IconButton
									size="small"
									sx={{ color: T.ink2, padding: '4px', '&:hover': { color: T.acc.hero, background: 'transparent' } }}
								>
									<LoginOutlinedIcon sx={{ fontSize: 14 }} />
								</IconButton>
							</Link>
						</Tooltip>
					)}
				</Box>
			</Box>
		</Drawer>
	);
}

export default SidebarMenu;
