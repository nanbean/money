import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Paper from '@mui/material/Paper';

import Container from '../../components/Container';

import { getNotificationsAction } from '../../actions/notificationActions';

export function NotificationLog () {
	const notifications = useSelector((state) => state.notifications);

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getNotificationsAction());
	}, [dispatch]);

	return (
		<div>
			<Container>
				{
					notifications.map(i => {
						return (
							<Paper
								key={i}
								sx={(theme) => ({
									marginTop: theme.spacing(2),
									padding: theme.spacing(1)
								})}
							>
								{i}
							</Paper >
						);
					})
				}
			</Container>
		</div>
	);
}

export default NotificationLog;
