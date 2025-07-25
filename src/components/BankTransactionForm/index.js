import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { evaluate } from 'mathjs';

import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';
import Input from '@mui/material/Input';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

import _ from 'lodash';

import AutoComplete from '../AutoComplete';

import {
	addTransactionAction,
	deleteTransactionAction,
	editTransactionAction
} from '../../actions/couchdbActions';

import {
	fillTransactionForm,
	resetTransactionForm,
	changeDate,
	changePayee,
	changeCategory,
	changeAmount,
	changeMemo
} from '../../actions/ui/form/bankTransaction';

export function BankTransactionForm ({
	account,
	accountId, 
	transactions
}) {
	const { categoryList } = useSelector((state) => state.settings);
	const dropPayeeList = useSelector((state) => state.dropPayeeList);
	const form = useSelector((state) => state.ui.form.bankTransaction);
	const dispatch = useDispatch();

	const handleSubmit = (event) => {
		event.preventDefault();

		if (form.isEdit) {
			onEditButton();
		} else {
			onAddButton();
		}
	};

	const onChange = handler => event => dispatch(handler(event.target.value));

	const handleCalculateAmount = () => {
		try {
			const result = evaluate(form.amount);
			if (typeof result === 'number' && !isNaN(result)) {
				const roundedResult = parseFloat(result.toFixed(2));
				dispatch(changeAmount(roundedResult));
			} else {
				console.warn('Calculation resulted in a non-numeric value or an error:', result);
			}
		} catch (e) {
			console.error('Invalid amount expression:', e);
		}
	};

	const onPayeeChange = handler => (event, value) => dispatch(handler(value));

	const onPayeeSelect = handler => (event, value) => {
		const matchIndex = _.findLastIndex(transactions, i => i.payee === value.name);
		const matchTransaction = matchIndex >= 0 && transactions[matchIndex];
		const transaction = {
			payee: value.name
		};
	
		if (matchTransaction) {
			transaction.amount = form.amount || matchTransaction.amount;
			if (matchTransaction.category && matchTransaction.subcategory) {
				transaction.category = `${matchTransaction.category}:${matchTransaction.subcategory}`;
			} else {
				transaction.category = matchTransaction.category;
			}
		}

		return dispatch(handler(transaction));
	};

	const onAddButton = () => {
		const data = {};
		const categoryArray = form.category.split(':');

		data.account = form.account || account;
		data.accountId = accountId || form.accountId;
		data.type = data.accountId.split(':')[1];
		data.date = form.date;
		data.payee = form.payee;
		data.category = form.category;
		data.amount = Number(form.amount);
		if (form.memo) {
			data.memo = form.memo;
		}

		if (categoryArray[0]) {
			data.category = categoryArray[0];
		}

		if (categoryArray[1]) {
			data.subcategory = categoryArray[1];
		}

		dispatch(addTransactionAction(data));
		dispatch(resetTransactionForm());
	};

	const onEditButton = () => {
		const transaction = transactions[form.index];
		const categoryArray = form.category.split(':');

		transaction.account = form.account || account;
		transaction.changed = {};

		if (transaction.date !== form.date) {
			transaction.changed.date = form.date;
		}
		if (transaction.payee !== form.payee) {
			if (!transaction.originalPayee) {
				transaction.originalPayee = transaction.payee;
			}
			transaction.changed.payee = form.payee;
		}
		if (transaction.amount !== form.amount) {
			transaction.changed.amount = Number(form.amount);
		}
		if (transaction.memo !== form.memo) {
			transaction.changed.memo = form.memo;
		}
		if (categoryArray[0] && transaction.category !== categoryArray[0]) {
			if (!transaction.originalCategory) {
				transaction.changed.originalCategory = transaction.category;
			}
			transaction.changed.category = categoryArray[0];
		}
		if (categoryArray[1] && transaction.subcategory !== categoryArray[1]) {
			if (!transaction.originalSubcategory) {
				transaction.changed.originalSubcategory = transaction.subcategory !== undefined ? transaction.subcategory:'';
			}
			transaction.changed.subcategory = categoryArray[1];
		}
		if (!categoryArray[1]) {
			transaction.changed.subcategory = '';
		}

		dispatch(editTransactionAction(transaction));
		dispatch(resetTransactionForm());
	};

	const onDeleteButton = handler => () => {
		const transaction = transactions[form.index];
		const categoryArray = form.category.split(':');

		transaction.account = form.account || account;
		transaction.date = form.date;
		transaction.payee = form.payee;
		transaction.amount = form.amount;
		transaction.memo = form.memo;
		if (categoryArray[0]) {
			transaction.category = categoryArray[0];
		}
		if (categoryArray[1]) {
			transaction.subcategory = categoryArray[1];
		}

		dispatch(handler(transaction));
		dispatch(resetTransactionForm());
	};

	return (
		<div>
			<form
				onSubmit={handleSubmit}
			>
				<FormControl required fullWidth>
					<Input
						id="date"
						type="date"
						name="date"
						autoComplete="off"
						placeholder="Date"
						value={form.date}
						fullWidth
						onChange={onChange(changeDate)}
					/>
				</FormControl>
				<FormControl required fullWidth>
					<AutoComplete
						value={form.payee}
						items={dropPayeeList}
						placeholder="Payee"
						onInputChange={onPayeeChange(changePayee)}
						onChange={onPayeeSelect(fillTransactionForm)}
					/>
				</FormControl>
				<FormControl required fullWidth variant="standard">
					<Select
						value={form.category}
						onChange={onChange(changeCategory)}
					>
						{
							categoryList.map(i => (
								<MenuItem key={i} value={i}>{i}</MenuItem>
							))
						}
					</Select>
				</FormControl>
				<Box display="flex" alignItems="center" width="100%">
					<FormControl required sx={{ flexGrow: 1, mr: 1 }}>
						<Input
							id="amount"
							type="text"
							name="amount"
							autoComplete="off"
							placeholder="Amount"
							fullWidth
							value={form.amount}
							onChange={onChange(changeAmount)}
						/>
					</FormControl>
					<Button
						variant="contained"
						color="secondary"
						onClick={handleCalculateAmount}
						sx={{ width: 30, height: 30, minWidth: 0 }}
					>
						=
					</Button>
				</Box>
				<FormControl fullWidth>
					<Input
						id="memo"
						name="memo"
						placeholder="Memo"
						value={form.memo}
						onChange={onChange(changeMemo)}
					/>
				</FormControl>
				<Button
					type="submit"
					fullWidth
					variant="contained"
					color="primary"
					sx={(theme) => ({
						marginTop: theme.spacing(1)
					})}
				>
					{form.isEdit ? 'Edit' : 'Add'}
				</Button>
				{
					form.isEdit &&
						<Button
							fullWidth
							variant="contained"
							color="secondary"
							sx={(theme) => ({
								marginTop: theme.spacing(1)
							})}
							onClick={onDeleteButton(deleteTransactionAction)}
						>
							Delete
						</Button>
				}
			</form>
		</div>
	);
}

BankTransactionForm.propTypes = {
	account: PropTypes.string,
	accountId: PropTypes.string,
	transactions: PropTypes.array
};

export default BankTransactionForm;
