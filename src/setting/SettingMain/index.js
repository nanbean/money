import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import GeneralIcon from '@mui/icons-material/ManageAccounts';
import NotificationLogIcon from '@mui/icons-material/Notes';
import CategoryIcon from '@mui/icons-material/Folder';
import AccountIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentIcon from '@mui/icons-material/Payment';

import Layout from '../../components/Layout';

import General from '../General';
import NotificationLog from '../NotificationLog';
import Category from '../Category';
import Account from '../Account';
import PaymentList from '../PaymentList';

import useMobile from '../../hooks/useMobile';

const TABS = [
	{
		id: 'general',
		label: 'General',
		icon: <GeneralIcon />,
		component: <General />
	},
	{
		id: 'account',
		label: 'Account',
		icon: <AccountIcon />,
		component: <Account />
	},
	{
		id: 'category',
		label: 'Category',
		icon: <CategoryIcon />,
		component: <Category />
	},
	{
		id: 'paymentList',
		label: 'Payment',
		icon: <PaymentIcon />,
		component: <PaymentList />
	},
	{
		id: 'notificationLog',
		label: 'Notification',
		icon: <NotificationLogIcon />,
		component: <NotificationLog />
	}
];

export function SettingMain () {
	const { tab } = useParams();
	const navigate = useNavigate();
	const [value, setValue] = useState(0);
	const isMobile = useMobile();

	useEffect(() => {
		const index = TABS.findIndex(t => t.id === tab);
		if (index >= 0) {
			setValue(index);
		} else {
			setValue(0);
		}
	}, [tab]);

	const handleChange = (event, val) => {
		navigate(`/setting/${TABS[val].id}`);
	};

	return (
		<Layout title="Setting">
			<Tabs value={value} onChange={handleChange}>
				{TABS.map(tabInfo => (
					<Tab key={tabInfo.id} label={isMobile ? tabInfo.icon : tabInfo.label} sx={{ minWidth: '75px' }} />
				))}
			</Tabs>
			{/* Render the component corresponding to the selected tab */}
			{TABS[value] && TABS[value].component}
		</Layout>
	);
}

export default SettingMain;
