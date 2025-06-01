import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
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
	const { currency, enableExchangeRateUpdate, exchangeRate } = useSelector((state) => state.settings.general);
	const [exchangeRateValue, setExchangeRateValue] = useState(exchangeRate);
	const dispatch = useDispatch();

	const onExchangeRateValueChange = (ev) => {
		setExchangeRateValue(ev.target.value);
	};

	const handleExchangeRateSend = () => {
		dispatch(updateGeneralAction('exchangeRate', exchangeRateValue));
	};

	const handleExchangeRateKeyDown = (event) => {
		if (event.key === 'Enter') {
			handleExchangeRateSend();
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
		dispatch(updateGeneralAction('currency', newCurrency));
	};

	const handleEnabeExchangeRateUpdateChange = (event) => {
		dispatch(updateGeneralAction('enableExchangeRateUpdate', event.target.checked));
	};

	return (
		<Stack spacing={2}>
			<Box
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				width="100%"
			>
				<Typography
					component="label"
					htmlFor="push-notification-switch"
					sx={{ cursor: 'pointer' }}
				>
					Push Notification
				</Typography>
				<Switch
					id="push-notification-switch"
					checked={!!messagingToken} onChange={handlePushNotificationChange} aria-label="Enable push notification switch" />
			</Box>
			<Divider sx={{ margin: 2 }} />
			<Box
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				width="100%"
			>
				<Typography id="currency-label">
					Currency
				</Typography>
				<ToggleButtonGroup
					size="small"
					value={currency}
					exclusive
					onChange={handleCurrencyChange}
					aria-labelledby="currency-label"
				>
					<ToggleButton value="KRW" sx={{ width: 40 }}>
						₩
					</ToggleButton>
					<ToggleButton value="USD" sx={{ width: 40 }}>
						$
					</ToggleButton>
				</ToggleButtonGroup>
			</Box>
			<Box
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				width="100%"
			>
				<Typography
					component="label"
					htmlFor="exchange-rate-update-switch"
					sx={{ cursor: 'pointer' }}
				>
					Exchange Rate Update
				</Typography>
				<Switch
					id="exchange-rate-update-switch"
					checked={enableExchangeRateUpdate} onChange={handleEnabeExchangeRateUpdateChange} aria-label="Enable exchange rate update switch" />
			</Box>
			<Box
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				width="100%"
			>
				<Typography
					component="label"
					htmlFor="exchange-rate-input"
					sx={{ cursor: 'pointer' }}
				>
					Exchange Rate
				</Typography>
				<TextField
					id="exchange-rate-input"
					value={exchangeRateValue}
					size="small"
					type="number"
					onChange={onExchangeRateValueChange}
					onBlur={handleExchangeRateSend} // Save when focus leaves the field
					onKeyDown={handleExchangeRateKeyDown} // Save when Enter key is pressed
					sx={{ width: '120px' }}
					variant="outlined"
				/>
			</Box>
		</Stack>
	);
}

export default General;
