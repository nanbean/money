import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import DesignPage from '../../components/DesignPage';

import General from '../General';
import NotificationLog from '../NotificationLog';
import Category from '../Category';
import Account from '../Account';
import PaymentList from '../PaymentList';

import useT from '../../hooks/useT';
import useMobile from '../../hooks/useMobile';

const TABS = [
	{ id: 'general',         en: 'General',      ko: '일반',       Icon: ManageAccountsOutlinedIcon,           Component: General },
	{ id: 'account',         en: 'Accounts',     ko: '계좌',       Icon: AccountBalanceWalletOutlinedIcon,     Component: Account },
	{ id: 'category',        en: 'Categories',   ko: '카테고리',   Icon: FolderOutlinedIcon,                   Component: Category },
	{ id: 'paymentList',     en: 'Payment',      ko: '정기 지불',   Icon: RepeatOutlinedIcon,                   Component: PaymentList },
	{ id: 'notificationLog', en: 'Notification', ko: '알림',       Icon: NotificationsOutlinedIcon,            Component: NotificationLog }
];

function NavItem ({ row, active, onClick, T }) {
	const { Icon } = row;
	const activeBg = T.acc.bg;
	const activeFg = T.acc.deep;
	return (
		<Box
			onClick={onClick}
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 1.5,
				padding: '11px 13px',
				borderRadius: '10px',
				background: active ? activeBg : 'transparent',
				color: active ? activeFg : T.ink,
				cursor: 'pointer',
				marginBottom: '3px',
				transition: 'background 0.12s, color 0.12s',
				'&:hover': { background: active ? activeBg : T.surf2 }
			}}
		>
			<Icon sx={{ fontSize: 18, color: active ? activeFg : T.ink2, flexShrink: 0 }} />
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography sx={{ fontSize: 13, fontWeight: 600, color: 'inherit', lineHeight: 1.2 }}>
					{row.en}
				</Typography>
				<Typography sx={{
					fontSize: 11,
					color: active ? activeFg : T.ink2,
					opacity: active ? 0.7 : 1,
					lineHeight: 1,
					marginTop: '2px'
				}}>
					{row.ko}
				</Typography>
			</Box>
			{active && <ChevronRightIcon sx={{ fontSize: 16, color: activeFg }} />}
		</Box>
	);
}

export function SettingMain () {
	const { tab } = useParams();
	const navigate = useNavigate();
	const isMobile = useMobile();
	const T = useT();

	const [active, setActive] = useState('general');

	useEffect(() => {
		const found = TABS.find(t => t.id === tab);
		setActive(found ? found.id : 'general');
	}, [tab]);

	const onSelect = (id) => {
		setActive(id);
		navigate(`/setting/${id}`);
	};

	const ActiveTab = useMemo(
		() => TABS.find(t => t.id === active) || TABS[0],
		[active]
	);
	const ActiveComponent = ActiveTab.Component;

	return (
		<DesignPage
			title="Settings"
			titleKo="설정"
			subtitle="Account, sync, display & data preferences."
		>
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
				gap: 2,
				alignItems: 'start'
			}}>
				{/* Sidebar nav */}
				<Box sx={{
					background: T.surf,
					border: `1px solid ${T.rule}`,
					borderRadius: '16px',
					padding: '12px',
					color: T.ink,
					position: { md: 'sticky' },
					top: { md: '20px' },
					...(isMobile ? {
						display: 'flex',
						flexDirection: 'row',
						overflowX: 'auto',
						gap: 1,
						padding: '8px'
					} : {})
				}}>
					{TABS.map(row => (
						<Box key={row.id} sx={isMobile ? { flexShrink: 0, minWidth: 140 } : {}}>
							<NavItem
								row={row}
								active={row.id === active}
								onClick={() => onSelect(row.id)}
								T={T}
							/>
						</Box>
					))}
				</Box>

				{/* Content panel */}
				<Box sx={{
					background: T.surf,
					border: `1px solid ${T.rule}`,
					borderRadius: '16px',
					padding: { xs: '16px', md: '20px' },
					color: T.ink,
					minWidth: 0
				}}>
					<Stack direction="row" alignItems="baseline" spacing={1} sx={{ marginBottom: 1.5 }}>
						<Typography sx={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>
							{ActiveTab.en}
						</Typography>
						<Typography sx={{ fontSize: 13, color: T.ink2, fontWeight: 400 }}>
							· {ActiveTab.ko}
						</Typography>
					</Stack>
					<ActiveComponent />
				</Box>
			</Box>
		</DesignPage>
	);
}

export default SettingMain;
