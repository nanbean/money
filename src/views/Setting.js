import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';

import {
	requestPermissionAction,
	removePermissionAction
} from '../actions/messagingActions';

import {
	updateExchageRateAction
} from '../actions/couchdbActions';


export function Setting () {
	const messagingToken = useSelector((state) => state.messagingToken);
	const exchangeRate = useSelector((state) => state.settings.exchangeRate);
	const [exchangeRateValue, setExchangeRateValue] = useState(exchangeRate);
	const navigate = useNavigate();
	const dispatch = useDispatch();

	const onValueChange = (ev) => {
		setExchangeRateValue(ev.target.value);
	};

	const handleExchangeRateSend = () => {
		dispatch(updateExchageRateAction(exchangeRateValue));
	};

	const handleNotificationLog = () => {
		navigate('/notificationlog');
	};

	const handlePushNotificationChange = (event) => {
		if (event.target.checked) {
			dispatch(requestPermissionAction());
		} else {
			dispatch(removePermissionAction());
		}
	};

	return (
		<div>
			<TitleHeader title="Setting" />
			<Container>
				<Paper
					sx={(theme) => ({
						[theme.breakpoints.up('lg')]: {
							marginTop: theme.spacing(2)
						},
						[theme.breakpoints.down('sm')]: {
							marginTop: 0
						},
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						padding: `${theme.spacing(2)} ${theme.spacing(3)} ${theme.spacing(3)}`
					})}
				>
					<Box>
						<Box sx={{ width: '100%' }}>
							<FormGroup>
								<FormControlLabel
									control={
										<Switch checked={messagingToken ? true : false} onChange={handlePushNotificationChange} aria-label="PushSwitch" />
									}
									label="푸쉬 알림 받기"
								/>
							</FormGroup>
						</Box>
						<Divider sx={{ margin: 2 }} />
						<Box>
							<Box>
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
							</Box>
						</Box>
						<Divider sx={{ margin: 2 }} />
						<Box>
							<Button
								fullWidth
								variant="contained"
								color="primary"
								onClick={handleNotificationLog}
							>
							Notification Log
							</Button>
						</Box>
					</Box>
				</Paper>
			</Container>
		</div>
	);
}

export default Setting;
