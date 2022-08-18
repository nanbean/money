import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import Amount from '../../components/Amount';

import { TYPE_EMOJI } from '../../constants';

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
					<TableCell align="center">Type</TableCell>
					<TableCell align="center">Account</TableCell>
					<TableCell align="center">Amount</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{filteredAccountList && filteredAccountList.map(row => (
					<TableRow key={row.name}>
						<TableCell component="th" scope="row" align="center">
							<span>
								{`${TYPE_EMOJI[row.type]} ${row.type}`}
							</span>
						</TableCell>
						<TableCell align="center">
							<span>
								<Link to={`/${row.type}/${row.name}`} style={linkStyle}>{row.name}</Link>
							</span>
						</TableCell>
						<TableCell align="center"><Amount value={row.balance} /></TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}