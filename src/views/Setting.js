import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

import TitleHeader from '../components/TitleHeader';
import Container from '../components/Container';

import {
	requestPermissionAction,
	removePermissionAction
} from '../actions/messagingActions';

export function Setting () {
	const messagingToken = useSelector((state) => state.messagingToken);
	const navigate = useNavigate();
	const dispatch = useDispatch();

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
					<FormGroup>
						<FormControlLabel
							control={
								<Switch checked={messagingToken ? true : false} onChange={handlePushNotificationChange} aria-label="PushSwitch" />
							}
							label="푸쉬 알림 받기"
						/>
					</FormGroup>
					<Button
						fullWidth
						variant="contained"
						color="primary"
						sx={(theme) => ({
							marginTop: theme.spacing(3)
						})}
						onClick={handleNotificationLog}
					>
						Notification Log
					</Button>
				</Paper>
			</Container>
		</div>
	);
}

export default Setting;
