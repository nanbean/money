import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AutoSizer, Column, Table } from 'react-virtualized';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { getNotificationsAction } from '../../actions/notificationActions';

export function NotificationLog () {
	const notifications = useSelector((state) => state.notifications);
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getNotificationsAction());
	}, [dispatch]);

	const rows = useMemo(() => notifications.map((n, index) => ({
		id: index,
		title: n.title || '',
		text: n.text || ''
	})), [notifications]);

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
							label="Title"
							dataKey="title"
							width={100}
							cellRenderer={({ cellData }) => (
								<Typography variant="body2" noWrap>{cellData}</Typography>
							)}
						/>
						<Column
							label="Text"
							dataKey="text"
							width={width - 100}
							cellRenderer={({ cellData }) => (
								<Typography variant="body2" noWrap color="text.secondary">{cellData}</Typography>
							)}
						/>
					</Table>
				)}
			</AutoSizer>
		</Box>
	);
}

export default NotificationLog;
