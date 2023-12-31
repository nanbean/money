import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Amount from '../../components/Amount';

import { TYPE_ICON } from '../../constants';

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

const filterAccountList = accountList => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i));

export default function AccountList () {
	const accountList = useSelector((state) => state.accountList);

	const filteredAccountList = useMemo(() => filterAccountList(accountList), [accountList]);

	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableCell align="center">Account</TableCell>
					<TableCell align="center">Amount</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{filteredAccountList && filteredAccountList.map(row => (
					<TableRow key={row.name}>
						<TableCell component="th" scope="row" align="center">
							<Link to={`/${row.type}/${row.name}`} style={linkStyle}>
								<Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
									{TYPE_ICON[row.type]}
									<Typography variant="body2">
										{row.name}
									</Typography >
								</Stack>
							</Link>
						</TableCell>
						<TableCell align="center"><Amount value={row.balance} /></TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}