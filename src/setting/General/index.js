import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import {
	requestPermissionAction,
	removePermissionAction
} from '../../actions/messagingActions';

import {
	updateGeneralAction
} from '../../actions/couchdbSettingActions';

export function General () {
	const messagingToken = useSelector((state) => state.messagingToken);
	const {
		currency,
		enableExchangeRateUpdate,
		exchangeRate,
		themeMode = 'auto'
	} = useSelector((state) => state.settings);
	const [exchangeRateValue, setExchangeRateValue] = useState(exchangeRate);
	const dispatch = useDispatch();

	const onExchangeRateValueChange = (ev) => {
		setExchangeRateValue(ev.target.value);
	};

	const handleExchangeRateSend = () => {
		const newRate = parseFloat(exchangeRateValue);
		if (!isNaN(newRate) && newRate !== exchangeRate) {
			dispatch(updateGeneralAction('exchangeRate', newRate));
		} else {
			setExchangeRateValue(exchangeRate);
		}
	};

	const handleExchangeRateKeyDown = (event) => {
		if (event.key === 'Enter') {
			// Save when Enter key is pressed
			event.target.blur();
		}
	};

	const handlePushNotificationChange = (event) => {
		if (event.target.checked) {
			dispatch(requestPermissionAction());
		} else {
			dispatch(removePermissionAction(messagingToken));
		}
	};

	const handleCurrencyChange = (event, newCurrency) => {
		if (newCurrency !== null) { // Prevent unselecting
			dispatch(updateGeneralAction('currency', newCurrency));
		}
	};

	const handleEnabeExchangeRateUpdateChange = (event) => {
		dispatch(updateGeneralAction('enableExchangeRateUpdate', event.target.checked));
	};

	const handleThemeModeChange = (event, newThemeMode) => {
		if (newThemeMode !== null) { // Prevent unselecting
			dispatch(updateGeneralAction('themeMode', newThemeMode));
		}
	};

	return (
		<List sx={{ width: '100%' }}>
			<ListSubheader sx={{ bgcolor: 'transparent' }}>Notifications</ListSubheader>
			<ListItem>
				<ListItemText
					id="push-notification-label"
					primary="Push Notification"
					secondary="Enable to receive transaction notifications"
				/>
				<ListItemSecondaryAction>
					<Switch
						edge="end"
						checked={!!messagingToken}
						onChange={handlePushNotificationChange}
						inputProps={{
							'aria-labelledby': 'push-notification-label'
						}}
					/>
				</ListItemSecondaryAction>
			</ListItem>
			<Divider component="li" sx={{ my: 1 }} />
			<ListSubheader sx={{ bgcolor: 'transparent' }}>Currency</ListSubheader>
			<ListItem>
				<ListItemText
					id="currency-label"
					primary="Display Currency"
					secondary="Select the currency for displaying amounts"
				/>
				<ListItemSecondaryAction>
					<ToggleButtonGroup
						size="small"
						value={currency}
						exclusive
						onChange={handleCurrencyChange}
						aria-labelledby="currency-label"
					>
						<ToggleButton value="KRW" aria-label="Korean Won" sx={{ width: 40 }}>
							₩
						</ToggleButton>
						<ToggleButton value="USD" aria-label="US Dollar" sx={{ width: 40 }}>
							$
						</ToggleButton>
					</ToggleButtonGroup>
				</ListItemSecondaryAction>
			</ListItem>
			<ListItem>
				<ListItemText
					id="exchange-rate-update-label"
					primary="Automatic Exchange Rate"
					secondary="Automatically fetch the latest KRW-USD rate"
				/>
				<ListItemSecondaryAction>
					<Switch
						edge="end"
						checked={enableExchangeRateUpdate}
						onChange={handleEnabeExchangeRateUpdateChange}
						inputProps={{
							'aria-labelledby': 'exchange-rate-update-label'
						}}
					/>
				</ListItemSecondaryAction>
			</ListItem>
			<ListItem>
				<ListItemText
					id="exchange-rate-label"
					primary="Manual Exchange Rate"
					secondary={enableExchangeRateUpdate ? 'Disabled when automatic update is on' : 'Set the rate manually'}
				/>
				<TextField
					id="exchange-rate-input"
					value={exchangeRateValue}
					size="small"
					type="number"
					onChange={onExchangeRateValueChange}
					onBlur={handleExchangeRateSend}
					onKeyDown={handleExchangeRateKeyDown}
					sx={{ width: '120px' }}
					variant="outlined"
					inputProps={{ 'aria-labelledby': 'exchange-rate-label' }}
				/>
			</ListItem>
			<Divider component="li" sx={{ my: 1 }} />
			<ListSubheader sx={{ bgcolor: 'transparent' }}>Theme</ListSubheader>
			<ListItem>
				<ListItemText
					id="theme-mode-label"
					primary="Theme Mode"
					secondary="Select your preferred theme"
				/>
				<ListItemSecondaryAction>
					<ToggleButtonGroup
						size="small"
						value={themeMode}
						exclusive
						onChange={handleThemeModeChange}
						aria-labelledby="theme-mode-label"
					>
						<ToggleButton value="auto" aria-label="Auto theme">
							Auto
						</ToggleButton>
						<ToggleButton value="light" aria-label="Light theme">
							Light
						</ToggleButton>
						<ToggleButton value="dark" aria-label="Dark theme">
							Dark
						</ToggleButton>
					</ToggleButtonGroup>
				</ListItemSecondaryAction>
			</ListItem>
		</List>
	);
}

export default General;
