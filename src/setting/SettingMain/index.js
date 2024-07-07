import React, { useState } from 'react';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';

import GeneralIcon from '@mui/icons-material/ManageAccounts';
import NotificationLogIcon from '@mui/icons-material/Notes';
import CategoryIcon from '@mui/icons-material/Folder';

import TitleHeader from '../../components/TitleHeader';
import Container from '../../components/Container';

import General from '../General';
import NotificationLog from '../NotificationLog';
import Category from '../Category';

import useMobile from '../../hooks/useMobile';

export const TAB_ICON = {
	'General': <GeneralIcon />,
	'Category': <CategoryIcon />,
	'Notification': <NotificationLogIcon />
};

export function SettingMain () {
	const [value, setValue] = useState(0);
	const isMobile = useMobile();

	const handleChange = (event, val) => {
		setValue(val);
	};

	return (
		<React.Fragment>
			<TitleHeader title="Setting" />
			<Container>
				<AppBar
					position="static"
					color="default"
					sx={(theme) => ({
						marginBottom: theme.spacing(1)
					})}
				>
					<Tabs value={value} onChange={handleChange}>
						<Tab label={isMobile ? TAB_ICON['General']:'General'} sx={ () => ({ minWidth: '75px' })} />
						<Tab label={isMobile ? TAB_ICON['Category']:'Category'} sx={ () => ({ minWidth: '75px' })} />
						<Tab label={isMobile ? TAB_ICON['Notification']:'Notification'} sx={ () => ({ minWidth: '75px' })} />
					</Tabs>
				</AppBar>
				{value === 0 && <General />}
				{value === 1 && <Category />}
				{value === 2 && <NotificationLog />}
			</Container>
		</React.Fragment>
	);
}

export default SettingMain;
