import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AutoSizer, Column, Table } from 'react-virtualized';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import AddIcon from '@mui/icons-material/Add';

import { TYPE_ICON_MAP, TYPE_NAME_MAP } from '../../constants';

import {
	addAccountAction,
	editAccountAction,
	deleteAccountAction
} from '../../actions/couchdbAccountActions';

export default function Account () {
	const accountList = useSelector((state) => state.accountList);
	const dispatch = useDispatch();

	const [open, setOpen] = useState(false);
	const [isEdit, setIsEdit] = useState(false);
	const [formData, setFormData] = useState({
		_id: '',
		name: '',
		type: 'Bank',
		currency: 'KRW',
		closed: false
	});

	const rows = useMemo(() => {
		if (!accountList) return [];
		return accountList.map((account) => ({
			...account,
			displayName: account.name || account.account,
			displayCurrency: account.currency === 'USD' ? '$' : '₩'
		})).sort((a, b) => {
			if (!!a.closed === !!b.closed) return 0;
			return a.closed ? 1 : -1;
		});
	}, [accountList]);

	const handleOpen = (account = null) => {
		if (account) {
			setIsEdit(true);
			setFormData({
				_id: account._id,
				name: account.name || account.account || '',
				type: account.type || 'Bank',
				currency: account.currency || 'KRW',
				closed: account.closed || false
			});
		} else {
			setIsEdit(false);
			setFormData({
				_id: '',
				name: '',
				type: 'Bank',
				currency: 'KRW',
				closed: false
			});
		}
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		const val = type === 'checkbox' ? checked : value;
		setFormData((prev) => ({ ...prev, [name]: val }));
	};

	const handleSubmit = (e) => {
		if (e) e.preventDefault();
		const newData = { ...formData, _id: `account:${formData.type}:${formData.name}` };
		if (isEdit) {
			dispatch(editAccountAction(newData));
			console.log('Edit account:', newData);
		} else {
			dispatch(addAccountAction(newData));
			console.log('Add account:', newData);
		}
		handleClose();
	};

	const handleDelete = () => {
		dispatch(deleteAccountAction(formData));
		console.log('Delete account:', formData);
		handleClose();
	};

	const onRowSelect = ({ index }) => {
		handleOpen(rows[index]);
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, mt: 1 }}>
			<Button
				fullWidth
				variant="outlined"
				color="primary"
				onClick={() => handleOpen()}
			>
				Add
				<AddIcon sx={(theme) => ({ marginLeft: theme.spacing(1) })} />
			</Button>
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
							onRowClick={onRowSelect}
							rowStyle={({ index }) => {
								if (index < 0) return {};
								return rows[index].closed ? { opacity: 0.5 } : {};
							}}
						>
							<Column
								label="Name"
								dataKey="displayName"
								width={width * 0.4}
							/>
							<Column
								label="Type"
								dataKey="type"
								width={width * 0.3}
								cellRenderer={({ cellData }) => {
									const Icon = TYPE_ICON_MAP[cellData];
									return (
										<Box sx={{ display: 'flex', alignItems: 'center' }}>
											{Icon && <Icon sx={{ mr: 1 }} fontSize="small" />}
											{TYPE_NAME_MAP[cellData] || cellData}
										</Box>
									);
								}}
							/>
							<Column
								label="Currency"
								dataKey="displayCurrency"
								width={width * 0.3}
							/>
						</Table>
					)}
				</AutoSizer>
			</Box>

			<Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
				<DialogTitle>{isEdit ? 'Edit Account' : 'New Account'}</DialogTitle>
				<DialogContent>
					<form onSubmit={handleSubmit}>
						<TextField
							autoFocus
							margin="dense"
							name="name"
							label="Account Name"
							type="text"
							fullWidth
							variant="standard"
							value={formData.name}
							onChange={handleChange}
							disabled={isEdit}
						/>
						<FormControl fullWidth margin="dense" variant="standard">
							<InputLabel>Type</InputLabel>
							<Select
								name="type"
								value={formData.type}
								onChange={handleChange}
								label="Type"
								disabled={isEdit}
							>
								<MenuItem value="Bank">Bank</MenuItem>
								<MenuItem value="Cash">Cash</MenuItem>
								<MenuItem value="CCard">Credit Card</MenuItem>
								<MenuItem value="Invst">Investment</MenuItem>
								<MenuItem value="Oth A">Other Asset</MenuItem>
								<MenuItem value="Oth L">Other Liability</MenuItem>
							</Select>
						</FormControl>
						<FormControl fullWidth margin="dense" variant="standard">
							<InputLabel>Currency</InputLabel>
							<Select
								name="currency"
								value={formData.currency}
								onChange={handleChange}
								label="Currency"
							>
								<MenuItem value="KRW">₩</MenuItem>
								<MenuItem value="USD">$</MenuItem>
							</Select>
						</FormControl>
						<FormControlLabel
							control={
								<Checkbox
									checked={formData.closed}
									onChange={handleChange}
									name="closed"
								/>
							}
							label="Closed"
						/>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
							sx={(theme) => ({ marginTop: theme.spacing(2) })}
						>
							{isEdit ? 'Edit' : 'Add'}
						</Button>
						{isEdit && (
							<Button
								fullWidth
								variant="contained"
								color="primary"
								sx={(theme) => ({ marginTop: theme.spacing(1) })}
								onClick={handleDelete}
							>
								Delete
							</Button>
						)}
					</form>
				</DialogContent>
			</Dialog>
		</Box>
	);
}