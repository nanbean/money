import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

import AutoComplete from '../AutoComplete';

import {
	addTransactionAction,
	deleteTransactionAction,
	editTransactionAction
} from '../../actions/couchdbActions';

import {
	resetTransactionForm,
	changeDate,
	changeInvestment,
	changeActivity,
	changeQuantity,
	changePrice,
	changeCommission,
	changeAmount
} from '../../actions/ui/form/investmentTransaction';

import './index.css';

const activityList = [
	'Buy',
	'Sell',
	'Div',
	'ShrsOut',
	'ShrsIn',
	'MiscExp'
];

export function InvestmentTransactionForm ({
	account,
	accountId,
	autocompleteInvestmentList,
	transactions
}) {
	const form = useSelector((state) => state.ui.form.investmentTransaction);
	const dispatch = useDispatch();

	const quantityDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp';
	const priceDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp';
	const commissionDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp' || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';
	const amountDisabled = !form.activity || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';

	const handleSubmit = (event) => {
		event.preventDefault();

		if (form.isEdit) {
			onEditButton();
		} else {
			onAddButton();
		}
	};

	const onChange = handler => event => dispatch(handler(event.target.value));

	const onInvestmentChange = handler => (event, value) => dispatch(handler(value.name));

	const onAddButton = () => {
		const data = {};
		if (!form.investment) {
			return;
		}
		data.account = account;
		data.accountId = accountId;
		data.date = form.date;
		data.investment = form.investment;
		data.activity = form.activity;
		data.quantity = Number(form.quantity);
		data.price = Number(form.price);
		if (form.commission) {
			data.commission = Number(form.commission);
		}
		data.amount = Number(form.amount);

		dispatch(addTransactionAction(data));
		dispatch(resetTransactionForm());
	};

	const onEditButton = () => {
		const transaction = transactions[form.index];

		transaction.account = account;
		transaction.changed = {};

		if (typeof form.date !== 'undefined') {
			transaction.changed.date = form.date;
		}
		if (typeof form.investment !== 'undefined') {
			transaction.changed.investment = form.investment;
		}
		if (typeof form.activity !== 'undefined') {
			transaction.changed.activity = form.activity;
		}
		if (typeof form.quantity !== 'undefined') {
			transaction.changed.quantity = Number(form.quantity);
		}
		if (typeof form.price !== 'undefined') {
			transaction.changed.price = Number(form.price);
		}
		if (typeof form.commission !== 'undefined') {
			transaction.changed.commission = Number(form.commission);
		}
		if (typeof form.amount !== 'undefined') {
			transaction.changed.amount = Number(form.amount);
		}

		dispatch(editTransactionAction(transaction));
		dispatch(resetTransactionForm());
	};

	const onDeleteButton = handler => () => {
		const transaction = transactions[form.index];

		transaction.account = account;
		if (typeof form.date !== 'undefined') {
			transaction.date = form.date;
		}
		if (typeof form.investment !== 'undefined') {
			transaction.investment = form.investment;
		}
		if (typeof form.activity !== 'undefined') {
			transaction.activity = form.activity;
		}
		if (typeof form.quantity !== 'undefined') {
			transaction.quantity = form.quantity;
		}
		if (typeof form.price !== 'undefined') {
			transaction.price = form.price;
		}
		if (typeof form.commission !== 'undefined') {
			transaction.commission = form.commission;
		}
		if (typeof form.amount !== 'undefined') {
			transaction.amount = form.amount;
		}

		dispatch(handler(transaction));
		dispatch(resetTransactionForm());
	};

	const sortedAutocompleteInvestmentList = useMemo(() => {
		const holdings = {};
		if (transactions) {
			transactions.forEach((transaction) => {
				if (transaction.investment) {
					if (!holdings[transaction.investment]) {
						holdings[transaction.investment] = 0;
					}
					if (transaction.activity === 'Buy' || transaction.activity === 'ShrsIn') {
						holdings[transaction.investment] += transaction.quantity;
					} else if (transaction.activity === 'Sell' || transaction.activity === 'ShrsOut') {
						holdings[transaction.investment] -= transaction.quantity;
					}
				}
			});
		}

		return [...(autocompleteInvestmentList || [])].sort((a, b) => {
			const aHeld = holdings[a.name] > 0;
			const bHeld = holdings[b.name] > 0;

			if (aHeld && !bHeld) {
				return -1;
			}
			if (!aHeld && bHeld) {
				return 1;
			}
			return a.name.localeCompare(b.name);
		});
	}, [autocompleteInvestmentList, transactions]);

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
						placeholder="Date"
						value={form.date}
						onChange={onChange(changeDate)}
					/>
				</FormControl>
				<AutoComplete
					value={form.investment}
					items={sortedAutocompleteInvestmentList}
					placeholder="Investment"
					onChange={onInvestmentChange(changeInvestment)}
				/>
				<FormControl required fullWidth variant="standard">
					<Select
						value={form.activity}
						onChange={onChange(changeActivity)}
						inputProps={{
							name: 'activity',
							id: 'activity-select'
						}}
					>
						{
							activityList.map(i => (
								<MenuItem key={i} value={i}>{i}</MenuItem>
							))
						}
					</Select>
				</FormControl>
				<FormControl fullWidth>
					<Input
						id="quantity"
						type="number"
						name="quantity"
						placeholder="Quantity"
						value={form.quantity}
						disabled={quantityDisabled}
						onChange={onChange(changeQuantity)}
					/>
				</FormControl>
				<FormControl fullWidth>
					<Input
						id="price"
						type="number"
						name="price"
						placeholder="Price"
						value={form.price}
						disabled={priceDisabled}
						onChange={onChange(changePrice)}
					/>
				</FormControl>
				<FormControl fullWidth>
					<Input
						id="commission"
						type="number"
						name="commission"
						placeholder="Commission"
						value={form.commission}
						disabled={commissionDisabled}
						onChange={onChange(changeCommission)}
					/>
				</FormControl>
				<FormControl required fullWidth>
					<Input
						id="amount"
						type="number"
						name="amount"
						placeholder="Amount"
						value={form.amount}
						disabled={amountDisabled}
						onChange={onChange(changeAmount)}
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

InvestmentTransactionForm.propTypes = {
	account: PropTypes.string.isRequired,
	accountId: PropTypes.string.isRequired,
	autocompleteInvestmentList: PropTypes.array,
	transactions: PropTypes.array
};

export default InvestmentTransactionForm;
