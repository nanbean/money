import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AutoSizer, Column, Table } from 'react-virtualized';

import Box from '@mui/material/Box';

import { getNotificationsAction } from '../../actions/notificationActions';

export function NotificationLog () {
	const notifications = useSelector((state) => state.notifications);
	const rows = useMemo(() => notifications.map((i, index) => ({ id: index, notification: i })), [notifications]);
	console.log('NotificationLog', notifications, rows);

	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getNotificationsAction());
	}, [dispatch]);

	return (
		<Box sx={{ flex: 1, mt: 1 }}>
			<AutoSizer>
				{({ height, width }) => (
					<Table
						headerClassName="header"
						rowClassName="row"
						width={width}
						height={height}
						headerHeight={40}
						rowHeight={40}
						rowCount={rows.length}
						rowGetter={({ index }) => rows[index]}
					>
						<Column
							label="Notification"
							dataKey="notification"
							width={width}
							cellRenderer={({ cellData }) => cellData}
						/>
					</Table>
				)}
			</AutoSizer>
		</Box>
	);
}

export default NotificationLog;
