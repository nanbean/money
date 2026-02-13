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

import {
	addPaymentAction,
	editPaymentAction,
	deletePaymentAction
} from '../../actions/couchdbSettingActions';

export default function PaymentList () {
	const { paymentList = [], categoryList = [] } = useSelector((state) => state.settings);
	const accountList = useSelector((state) => state.accountList);
	const dispatch = useDispatch();

	const [open, setOpen] = useState(false);
	const [editIndex, setEditIndex] = useState(-1);
	const [formData, setFormData] = useState({
		payee: '',
		accountId: '',
		account: '',
		amount: 0,
		currency: 'KRW',
		day: 1,
		category: '',
		subcategory: '',
		memo: '',
		valid: true
	});

	const rows = useMemo(() => {
		return paymentList.map((p, index) => ({
			...p,
			originalIndex: index,
			accountName: (accountList.find(a => a._id === p.accountId) || {}).name || p.account
		})).sort((a, b) => {
			if (!!a.valid === !!b.valid) return 0;
			return a.valid ? -1 : 1;
		});
	}, [paymentList, accountList]);

	const handleOpen = (index = -1) => {
		if (index >= 0) {
			const originalIndex = rows[index].originalIndex;
			setEditIndex(originalIndex);
			const item = paymentList[originalIndex];
			setFormData({ ...item });
		} else {
			setEditIndex(-1);
			setFormData({
				payee: '',
				accountId: '',
				account: '',
				amount: 0,
				currency: 'KRW',
				day: 1,
				category: '',
				subcategory: '',
				memo: '',
				valid: true
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

	const handleCategoryChange = (e) => {
		const val = e.target.value;
		const [cat, sub] = val.split(':');
		setFormData(prev => ({
			...prev,
			category: cat,
			subcategory: sub || ''
		}));
	};

	const handleAccountChange = (e) => {
		const accountId = e.target.value;
		const account = accountList.find(a => a._id === accountId);
		if (account) {
			setFormData(prev => ({
				...prev,
				accountId: accountId,
				account: account.name,
				currency: account.currency
			}));
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const data = {
			...formData,
			amount: Number(formData.amount),
			day: Number(formData.day)
		};

		if (editIndex >= 0) {
			dispatch(editPaymentAction(editIndex, data));
		} else {
			dispatch(addPaymentAction(data));
		}
		handleClose();
	};

	const handleDelete = () => {
		if (editIndex >= 0) {
			dispatch(deletePaymentAction(editIndex));
		}
		handleClose();
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
							onRowClick={({ index }) => handleOpen(index)}
							rowStyle={({ index }) => {
								if (index < 0) return {};
								return !rows[index].valid ? { opacity: 0.5 } : {};
							}}
						>
							<Column
								label="Payee"
								dataKey="payee"
								width={width * 0.4}
							/>
							<Column
								label="Account"
								dataKey="accountName"
								width={width * 0.3}
							/>
							<Column
								label="Amount"
								dataKey="amount"
								width={width * 0.2}
							/>
							<Column
								label="Day"
								dataKey="day"
								width={width * 0.1}
							/>
						</Table>
					)}
				</AutoSizer>
			</Box>

			<Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
				<DialogTitle>{editIndex >= 0 ? 'Edit Payment' : 'New Payment'}</DialogTitle>
				<DialogContent>
					<form onSubmit={handleSubmit}>
						<TextField
							autoFocus
							margin="dense"
							name="payee"
							label="Payee"
							type="text"
							fullWidth
							variant="standard"
							value={formData.payee}
							onChange={handleChange}
							required
						/>
						<FormControl fullWidth margin="dense" variant="standard">
							<InputLabel>Account</InputLabel>
							<Select
								name="accountId"
								value={formData.accountId}
								onChange={handleAccountChange}
								label="Account"
								required
							>
								{accountList.filter(a => !a.closed && (a.type === 'Bank' || a.type === 'CCard' || a.type === 'Cash')).map(a => (
									<MenuItem key={a._id} value={a._id}>{a.name}</MenuItem>
								))}
							</Select>
						</FormControl>
						<TextField
							margin="dense"
							name="amount"
							label="Amount"
							type="number"
							fullWidth
							variant="standard"
							value={formData.amount}
							onChange={handleChange}
							required
						/>
						<TextField
							margin="dense"
							name="day"
							label="Day"
							type="number"
							fullWidth
							variant="standard"
							value={formData.day}
							onChange={handleChange}
							required
							inputProps={{ min: 1, max: 31 }}
						/>
						<FormControl fullWidth margin="dense" variant="standard">
							<InputLabel>Category</InputLabel>
							<Select
								value={formData.category + (formData.subcategory ? ':' + formData.subcategory : '')}
								onChange={handleCategoryChange}
								label="Category"
							>
								{categoryList.map(c => (
									<MenuItem key={c} value={c}>{c}</MenuItem>
								))}
							</Select>
						</FormControl>
						<TextField
							margin="dense"
							name="memo"
							label="Memo"
							type="text"
							fullWidth
							variant="standard"
							value={formData.memo}
							onChange={handleChange}
						/>
						<FormControlLabel
							control={
								<Checkbox
									checked={formData.valid}
									onChange={handleChange}
									name="valid"
								/>
							}
							label="Valid"
						/>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
							sx={(theme) => ({ marginTop: theme.spacing(2) })}
						>
							{editIndex >= 0 ? 'Edit' : 'Add'}
						</Button>
						{editIndex >= 0 && (
							<Button
								fullWidth
								variant="contained"
								color="secondary"
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