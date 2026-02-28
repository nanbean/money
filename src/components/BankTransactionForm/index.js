import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { evaluate } from 'mathjs';

import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CallSplitIcon from '@mui/icons-material/CallSplit';

import { findLastIndex } from 'lodash';

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

	const [isSplit, setIsSplit] = useState(false);
	const [divisions, setDivisions] = useState([]);

	useEffect(() => {
		if (form.isEdit && transactions[form.index]) {
			const transaction = transactions[form.index];
			if (transaction.division && transaction.division.length > 0) {
				setIsSplit(true);
				setDivisions(transaction.division.map(d => ({
					category: d.subcategory ? `${d.category}:${d.subcategory}` : d.category,
					amount: d.amount,
					memo: d.description || ''
				})));
			} else {
				setIsSplit(false);
				setDivisions([]);
			}
		} else {
			setIsSplit(false);
			setDivisions([]);
		}
	}, [form.isEdit, form.index, transactions]);

	const onToggleSplit = () => {
		if (!isSplit) {
			setIsSplit(true);
			setDivisions([{
				category: form.category || '',
				amount: form.amount || 0,
				memo: form.memo || ''
			}]);
		} else {
			setIsSplit(false);
			const total = divisions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
			dispatch(changeAmount(total));
			if (divisions.length > 0) {
				dispatch(changeCategory(divisions[0].category));
				dispatch(changeMemo(divisions[0].memo));
			}
		}
	};

	const onDivisionChange = (index, key, value) => {
		const newDivisions = [...divisions];
		newDivisions[index][key] = value;
		setDivisions(newDivisions);
	};

	const onAddSplit = () => {
		setDivisions([...divisions, { category: '', amount: 0, memo: '' }]);
	};

	const onRemoveSplit = (index) => {
		const newDivisions = divisions.filter((_, i) => i !== index);
		setDivisions(newDivisions);
		if (newDivisions.length === 0) {
			setIsSplit(false);
		}
	};

	const totalAmount = divisions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

	const handleSubmit = (event) => {
		event.preventDefault();

		if (form.isEdit) {
			onEditButton();
		} else {
			onAddButton();
		}
	};

	const onChange = handler => event => dispatch(handler(event.target.value));

	const handleAmountChange = (event) => {
		const value = event.target.value.replace(/,/g, '');
		dispatch(changeAmount(value));
	};

	const isAmountExpression = (value) => {
		const hasOperator = /[+\-*/]/.test(value);
		const numbersFound = value.match(/-?\d+(\.\d+)?/g);
		const hasAtLeastTwoNumbers = numbersFound && numbersFound.length >= 2;
		return hasOperator && hasAtLeastTwoNumbers;
	};

	const handleCalculateAmount = () => {
		if (isAmountExpression(form.amount)) {
			try {
				const result = evaluate(form.amount);
				if (typeof result === 'number' && !isNaN(result)) {
					const roundedResult = parseFloat(result.toFixed(2));
					dispatch(changeAmount(roundedResult));
				}
			} catch (e) {
				console.error('Invalid amount expression:', e);
			}
		}
	};

	const handleAmountKeyDown = (event) => {
		if (event.key === 'Enter' && isAmountExpression(form.amount)) {
			event.preventDefault();
			handleCalculateAmount();
		}
	};

	const onPayeeChange = handler => (_, value) => dispatch(handler(value));

	const onPayeeSelect = handler => (_, value) => {
		const matchIndex = findLastIndex(transactions, i => i.payee === value.name);
		const matchTransaction = matchIndex >= 0 && transactions[matchIndex];
		const transaction = {
			payee: value.name
		};
	
		if (matchTransaction) {
			if (matchTransaction.division && matchTransaction.division.length > 0) {
				setIsSplit(true);
				setDivisions(matchTransaction.division.map(d => ({
					category: d.subcategory ? `${d.category}:${d.subcategory}` : d.category,
					amount: d.amount,
					memo: d.description || ''
				})));
				transaction.amount = matchTransaction.amount;
			} else {
				setIsSplit(false);
				setDivisions([]);
				transaction.amount = form.amount || matchTransaction.amount;
			}

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

		data.account = form.account || account;
		data.accountId = accountId || form.accountId;
		data.type = data.accountId.split(':')[1];
		data.date = form.date;
		data.payee = form.payee;

		if (isSplit) {
			data.amount = totalAmount;
			data.division = divisions.map(d => {
				const catParts = d.category.split(':');
				return {
					category: catParts[0],
					subcategory: catParts[1] || '',
					description: d.memo,
					amount: Number(d.amount)
				};
			});
			if (divisions.length > 0) {
				const catParts = divisions[0].category.split(':');
				data.category = catParts[0];
				if (catParts[1]) data.subcategory = catParts[1];
				if (divisions[0].memo) data.memo = divisions[0].memo;
			} else {
				data.category = form.category.split(':')[0];
			}
		} else {
			const categoryArray = form.category.split(':');
			data.category = form.category;
			data.amount = Number(form.amount);
			if (form.memo) {
				data.memo = form.memo;
			}
			if (categoryArray[0]) data.category = categoryArray[0];
			if (categoryArray[1]) data.subcategory = categoryArray[1];
		}

		dispatch(addTransactionAction(data));
		dispatch(resetTransactionForm());
	};

	const onEditButton = () => {
		const transaction = transactions[form.index];

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

		if (isSplit) {
			transaction.changed.amount = totalAmount;
			transaction.changed.division = divisions.map(d => {
				const catParts = d.category.split(':');
				return {
					category: catParts[0],
					subcategory: catParts[1] || '',
					description: d.memo,
					amount: Number(d.amount)
				};
			});
			if (divisions.length > 0) {
				const catParts = divisions[0].category.split(':');
				transaction.changed.category = catParts[0];
				transaction.changed.subcategory = catParts[1] || '';
				transaction.changed.memo = divisions[0].memo;
			}
		} else {
			const categoryArray = form.category.split(':');
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
			if (transaction.division) {
				transaction.changed.division = null;
			}
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
		<form onSubmit={handleSubmit}>
			<Stack spacing={1.5}>
				<FormControl required fullWidth>
					<Input
						id="date"
						type="date"
						name="date"
						autoComplete="off"
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
				{isSplit ? (
					<Stack spacing={1}>
						{divisions.map((division, index) => (
							<Stack key={index} direction="row" spacing={1} alignItems="center">
								<FormControl fullWidth variant="standard" sx={{ flex: 2 }}>
									<Select
										value={division.category}
										onChange={(e) => onDivisionChange(index, 'category', e.target.value)}
										displayEmpty
									>
										<MenuItem value="" disabled>
											<em>Category</em>
										</MenuItem>
										{categoryList.map(i => (
											<MenuItem key={i} value={i}>{i}</MenuItem>
										))}
									</Select>
								</FormControl>
								<FormControl sx={{ flex: 1 }}>
									<Input
										type="number"
										placeholder="Amount"
										value={division.amount}
										onChange={(e) => onDivisionChange(index, 'amount', e.target.value)}
									/>
								</FormControl>
								<FormControl sx={{ flex: 1.5 }}>
									<Input
										placeholder="Memo"
										value={division.memo}
										onChange={(e) => onDivisionChange(index, 'memo', e.target.value)}
									/>
								</FormControl>
								<IconButton onClick={() => onRemoveSplit(index)} size="small" color="error">
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Stack>
						))}
						<Stack direction="row" justifyContent="space-between" alignItems="center">
							<Button size="small" startIcon={<AddIcon />} onClick={onAddSplit}>
								Add Split
							</Button>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="body2" color="text.secondary">
									Total: {totalAmount}
								</Typography>
								<IconButton size="small" onClick={onToggleSplit} color="primary">
									<CallSplitIcon fontSize="small" />
								</IconButton>
							</Stack>
						</Stack>
					</Stack>
				) : (
					<>
						<FormControl required fullWidth variant="standard">
							<Select
								value={form.category}
								onChange={onChange(changeCategory)}
							>
								{categoryList.map(i => (
									<MenuItem key={i} value={i}>{i}</MenuItem>
								))}
							</Select>
						</FormControl>
						<Stack direction="row" spacing={1} alignItems="flex-end">
							<FormControl required sx={{ flexGrow: 1 }}>
								<Input
									id="amount"
									type="text"
									name="amount"
									autoComplete="off"
									placeholder="Amount"
									fullWidth
									value={form.amount}
									onChange={handleAmountChange}
									onKeyDown={handleAmountKeyDown}
								/>
							</FormControl>
							<IconButton
								size="small"
								onClick={handleCalculateAmount}
								color="secondary"
								sx={{ mb: '2px' }}
							>
								<Typography variant="body2" fontWeight="bold">=</Typography>
							</IconButton>
							<IconButton size="small" onClick={onToggleSplit} color="primary" sx={{ mb: '2px' }}>
								<CallSplitIcon fontSize="small" />
							</IconButton>
						</Stack>
						<FormControl fullWidth>
							<Input
								id="memo"
								name="memo"
								placeholder="Memo"
								value={form.memo}
								onChange={onChange(changeMemo)}
							/>
						</FormControl>
					</>
				)}
				{form.isEdit ? (
					<Stack direction="row" spacing={1}>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
						>
							Edit
						</Button>
						<Button
							fullWidth
							variant="outlined"
							color="error"
							onClick={onDeleteButton(deleteTransactionAction)}
						>
							Delete
						</Button>
					</Stack>
				) : (
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="primary"
					>
						Add
					</Button>
				)}
			</Stack>
		</form>
	);
}

BankTransactionForm.propTypes = {
	account: PropTypes.string,
	accountId: PropTypes.string,
	transactions: PropTypes.array
};

export default BankTransactionForm;
