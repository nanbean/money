import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { evaluate } from 'mathjs';
import { findLastIndex } from 'lodash';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import RemoveIcon from '@mui/icons-material/Remove';

import AutoComplete from '../AutoComplete';

import useT from '../../hooks/useT';
import { sMono } from '../../utils/designTokens';

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

const fieldLabelSx = (T) => ({
	fontSize: 11,
	fontWeight: 600,
	color: T.ink2,
	marginBottom: '6px',
	display: 'block',
	textTransform: 'uppercase',
	letterSpacing: '0.04em'
});

const inputSx = (T) => ({
	width: '100%',
	padding: '10px 12px',
	fontSize: 13,
	fontFamily: 'inherit',
	background: T.bg,
	color: T.ink,
	border: `1px solid ${T.rule}`,
	borderRadius: '8px',
	outline: 'none',
	boxSizing: 'border-box',
	colorScheme: T.dark ? 'dark' : 'light',
	'&:focus': { borderColor: T.acc.hero }
});

const selectSx = (T) => ({
	width: '100%',
	background: T.bg,
	color: T.ink,
	borderRadius: '8px',
	fontSize: 13,
	'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
	'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
	'&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
	'& .MuiSelect-select': { padding: '10px 12px' }
});

export function BankTransactionForm ({
	account,
	accountId,
	transactions,
	onClose
}) {
	const T = useT();

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
		if (newDivisions.length === 0) setIsSplit(false);
	};

	const totalAmount = divisions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

	const handleSubmit = (event) => {
		event.preventDefault();
		if (form.isEdit) onEditButton();
		else onAddButton();
	};

	const onChange = handler => event => dispatch(handler(event.target.value));

	const handleAmountChange = (event) => {
		const value = event.target.value.replace(/,/g, '');
		dispatch(changeAmount(value));
	};

	const isAmountExpression = (value) => {
		const hasOperator = /[+\-*/]/.test(value);
		const numbersFound = String(value).match(/-?\d+(\.\d+)?/g);
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
		const transaction = { payee: value.name };

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
			if (form.memo) data.memo = form.memo;
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

		if (transaction.date !== form.date) transaction.changed.date = form.date;
		if (transaction.payee !== form.payee) {
			if (!transaction.originalPayee) transaction.originalPayee = transaction.payee;
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
			if (transaction.amount !== form.amount) transaction.changed.amount = Number(form.amount);
			if (transaction.memo !== form.memo) transaction.changed.memo = form.memo;
			if (categoryArray[0] && transaction.category !== categoryArray[0]) {
				if (!transaction.originalCategory) transaction.changed.originalCategory = transaction.category;
				transaction.changed.category = categoryArray[0];
			}
			if (categoryArray[1] && transaction.subcategory !== categoryArray[1]) {
				if (!transaction.originalSubcategory) {
					transaction.changed.originalSubcategory = transaction.subcategory !== undefined ? transaction.subcategory : '';
				}
				transaction.changed.subcategory = categoryArray[1];
			}
			if (!categoryArray[1]) transaction.changed.subcategory = '';
			if (transaction.division) transaction.changed.division = null;
		}

		dispatch(editTransactionAction(transaction));
		dispatch(resetTransactionForm());
	};

	const onDeleteButton = () => {
		const transaction = transactions[form.index];
		const categoryArray = form.category.split(':');

		transaction.account = form.account || account;
		transaction.date = form.date;
		transaction.payee = form.payee;
		transaction.amount = form.amount;
		transaction.memo = form.memo;
		if (categoryArray[0]) transaction.category = categoryArray[0];
		if (categoryArray[1]) transaction.subcategory = categoryArray[1];

		dispatch(deleteTransactionAction(transaction));
		dispatch(resetTransactionForm());
	};

	const iconBtnSx = {
		width: 36,
		height: 36,
		borderRadius: '8px',
		border: `1px solid ${T.rule}`,
		color: T.ink2,
		flexShrink: 0,
		'&:hover': { borderColor: T.acc.hero, color: T.acc.hero, background: 'transparent' }
	};

	return (
		<Box component="form" onSubmit={handleSubmit}>
			{/* Date + Payee */}
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
				gap: 2,
				marginBottom: 2
			}}>
				<Box>
					<Typography sx={fieldLabelSx(T)}>Date</Typography>
					<Box
						component="input"
						type="date"
						value={form.date || ''}
						onChange={onChange(changeDate)}
						required
						sx={inputSx(T)}
					/>
				</Box>
				<Box>
					<Typography sx={fieldLabelSx(T)}>Payee</Typography>
					<AutoComplete
						value={form.payee}
						items={dropPayeeList}
						placeholder="Payee"
						onInputChange={onPayeeChange(changePayee)}
						onChange={onPayeeSelect(fillTransactionForm)}
					/>
				</Box>
			</Box>

			{/* Category / Amount / Memo — split-aware */}
			{isSplit ? (
				<Box sx={{ marginBottom: 2 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1 }}>
						<Typography sx={fieldLabelSx(T)}>Splits</Typography>
						<Typography sx={{ ...sMono, fontSize: 12, color: T.ink2 }}>
							Total: {totalAmount.toLocaleString()}
						</Typography>
					</Stack>
					<Stack spacing={1}>
						{divisions.map((division, index) => (
							<Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
								<FormControl sx={{ flex: 2, minWidth: 0 }}>
									<Select
										value={division.category}
										onChange={(e) => onDivisionChange(index, 'category', e.target.value)}
										displayEmpty
										sx={selectSx(T)}
										MenuProps={{ PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } } }}
									>
										<MenuItem value="" disabled>
											<em>Category</em>
										</MenuItem>
										{categoryList.map(i => (
											<MenuItem key={i} value={i}>{i}</MenuItem>
										))}
									</Select>
								</FormControl>
								<Box
									component="input"
									type="number"
									placeholder="Amount"
									value={division.amount}
									onChange={(e) => onDivisionChange(index, 'amount', e.target.value)}
									sx={{ ...inputSx(T), flex: 1 }}
								/>
								<Box
									component="input"
									placeholder="Memo"
									value={division.memo}
									onChange={(e) => onDivisionChange(index, 'memo', e.target.value)}
									sx={{ ...inputSx(T), flex: 1.5 }}
								/>
								<IconButton
									onClick={() => onRemoveSplit(index)}
									size="small"
									sx={{ ...iconBtnSx, color: T.neg, '&:hover': { color: T.neg, borderColor: T.neg } }}
								>
									<RemoveIcon sx={{ fontSize: 16 }} />
								</IconButton>
							</Stack>
						))}
					</Stack>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginTop: 1.25 }}>
						<Button
							size="small"
							onClick={onAddSplit}
							startIcon={<AddIcon sx={{ fontSize: 14 }} />}
							sx={{
								background: 'transparent',
								border: `1px solid ${T.rule}`,
								color: T.ink,
								borderRadius: '999px',
								padding: '4px 12px',
								fontSize: 11,
								fontWeight: 600,
								textTransform: 'none',
								'&:hover': { borderColor: T.acc.hero, color: T.acc.hero }
							}}
						>
							Add split
						</Button>
						<Button
							size="small"
							onClick={onToggleSplit}
							startIcon={<CallSplitIcon sx={{ fontSize: 14 }} />}
							sx={{
								background: 'transparent',
								color: T.acc.bright,
								borderRadius: '999px',
								padding: '4px 12px',
								fontSize: 11,
								fontWeight: 600,
								textTransform: 'none',
								'&:hover': { background: T.surf2 }
							}}
						>
							Merge to single
						</Button>
					</Stack>
				</Box>
			) : (
				<>
					<Box sx={{ marginBottom: 2 }}>
						<Typography sx={fieldLabelSx(T)}>Category</Typography>
						<FormControl fullWidth>
							<Select
								value={form.category || ''}
								onChange={onChange(changeCategory)}
								displayEmpty
								required
								sx={selectSx(T)}
								MenuProps={{ PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } } }}
							>
								<MenuItem value="" disabled>
									<em>Select a category</em>
								</MenuItem>
								{categoryList.map(i => (
									<MenuItem key={i} value={i}>{i}</MenuItem>
								))}
							</Select>
						</FormControl>
					</Box>

					<Box sx={{ marginBottom: 2 }}>
						<Typography sx={fieldLabelSx(T)}>Amount</Typography>
						<Stack direction="row" spacing={1} alignItems="stretch">
							<Box
								component="input"
								id="amount"
								type="text"
								name="amount"
								autoComplete="off"
								placeholder="0 — supports +, −, *, /"
								value={form.amount ?? ''}
								onChange={handleAmountChange}
								onKeyDown={handleAmountKeyDown}
								required
								sx={{ ...inputSx(T), ...sMono, flex: 1 }}
							/>
							<IconButton
								onClick={handleCalculateAmount}
								size="small"
								title="Evaluate expression"
								sx={iconBtnSx}
							>
								<Typography sx={{ fontSize: 14, fontWeight: 700, color: 'inherit' }}>=</Typography>
							</IconButton>
							<IconButton
								onClick={onToggleSplit}
								size="small"
								title="Split into multiple categories"
								sx={iconBtnSx}
							>
								<CallSplitIcon sx={{ fontSize: 16 }} />
							</IconButton>
						</Stack>
					</Box>

					<Box sx={{ marginBottom: 2 }}>
						<Typography sx={fieldLabelSx(T)}>Memo</Typography>
						<Box
							component="input"
							id="memo"
							name="memo"
							placeholder="Optional note"
							value={form.memo || ''}
							onChange={onChange(changeMemo)}
							sx={inputSx(T)}
						/>
					</Box>
				</>
			)}

			{/* Footer */}
			<Stack direction="row" spacing={1} sx={{ marginTop: 3, alignItems: 'center' }}>
				{form.isEdit && (
					<Button
						onClick={onDeleteButton}
						startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
						sx={{
							background: 'transparent',
							border: `1px solid ${T.neg}55`,
							color: T.neg,
							borderRadius: '999px',
							padding: '8px 14px',
							fontSize: 12,
							fontWeight: 600,
							textTransform: 'none',
							'&:hover': { background: `${T.neg}11`, borderColor: T.neg }
						}}
					>
						Delete
					</Button>
				)}
				<Box sx={{ flex: 1 }} />
				<Button
					onClick={onClose}
					sx={{
						background: 'transparent',
						border: `1px solid ${T.rule}`,
						color: T.ink,
						borderRadius: '999px',
						padding: '8px 16px',
						fontSize: 12,
						fontWeight: 600,
						textTransform: 'none',
						'&:hover': { background: T.surf2 }
					}}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					sx={{
						background: T.acc.hero,
						color: '#fff',
						border: 'none',
						borderRadius: '999px',
						padding: '9px 18px',
						fontSize: 12,
						fontWeight: 700,
						textTransform: 'none',
						'&:hover': { background: T.acc.hero, opacity: 0.9 }
					}}
				>
					{form.isEdit ? 'Save' : 'Create'}
				</Button>
			</Stack>
		</Box>
	);
}

BankTransactionForm.propTypes = {
	account: PropTypes.string,
	accountId: PropTypes.string,
	onClose: PropTypes.func,
	transactions: PropTypes.array
};

export default BankTransactionForm;
