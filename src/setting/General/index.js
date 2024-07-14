import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import {
	requestPermissionAction,
	removePermissionAction
} from '../../actions/messagingActions';

import {
	updateExchageRateAction
} from '../../actions/couchdbActions';

export function General () {
	const messagingToken = useSelector((state) => state.messagingToken);
	const exchangeRate = useSelector((state) => state.settings.exchangeRate);
	const [exchangeRateValue, setExchangeRateValue] = useState(exchangeRate);
	const dispatch = useDispatch();

	const onValueChange = (ev) => {
		setExchangeRateValue(ev.target.value);
	};

	const handleExchangeRateSend = () => {
		dispatch(updateExchageRateAction(exchangeRateValue));
	};

	const handlePushNotificationChange = (event) => {
		if (event.target.checked) {
			dispatch(requestPermissionAction());
		} else {
			dispatch(removePermissionAction(messagingToken));
		}
	};

	return (
		<Stack spacing={2}>
			<FormGroup>
				<FormControlLabel
					control={
						<Switch checked={messagingToken ? true : false} onChange={handlePushNotificationChange} aria-label="PushSwitch" />
					}
					label="푸쉬 알림 받기"
				/>
			</FormGroup>
			<Divider sx={{ margin: 2 }} />
			<Stack direction="row" spacing={1}>
				<TextField
					label="Exchange Rate"
					id="outlined-size-small"
					value={exchangeRateValue}
					size="small"
					type="number"
					InputLabelProps={{
						shrink: true
					}}
					onChange={onValueChange}
				/>
				<Button
					variant="contained"
					color="primary"
					onClick={handleExchangeRateSend}
				>
					Change
				</Button>
			</Stack>

		</Stack>
	);
}

export default General;
