import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import AutoComplete from '../AutoComplete';

import useT from '../../hooks/useT';
import { sMono } from '../../utils/designTokens';

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

const ACTIVITIES = [
	{ value: 'Buy',     label: 'Buy' },
	{ value: 'Sell',    label: 'Sell' },
	{ value: 'Div',     label: 'Dividend' },
	{ value: 'ShrsIn',  label: 'Shares in' },
	{ value: 'ShrsOut', label: 'Shares out' },
	{ value: 'MiscExp', label: 'Misc. expense' }
];

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
	'&:focus': { borderColor: T.acc.hero },
	'&:disabled': { opacity: 0.5, cursor: 'not-allowed' }
});

export function InvestmentTransactionForm ({
	account,
	accountId,
	autocompleteInvestmentList,
	transactions,
	onClose
}) {
	const T = useT();

	const form = useSelector((state) => state.ui.form.investmentTransaction);
	const dispatch = useDispatch();

	const quantityDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp';
	const priceDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp';
	const commissionDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp' || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';
	const amountDisabled = !form.activity || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';

	const handleSubmit = (event) => {
		event.preventDefault();
		if (form.isEdit) onEditButton();
		else onAddButton();
	};

	const onChange = handler => event => dispatch(handler(event.target.value));

	const onInvestmentChange = handler => (_, value) => dispatch(handler(value.name));
	const onInvestmentInputChange = handler => (_, value) => dispatch(handler(value));

	const onAddButton = () => {
		const data = {};
		if (!form.investment) return;
		data.account = account;
		data.accountId = accountId;
		data.date = form.date;
		data.investment = form.investment;
		data.activity = form.activity;
		data.quantity = Number(form.quantity);
		data.price = Number(form.price);
		if (form.commission) data.commission = Number(form.commission);
		data.amount = Number(form.amount);

		dispatch(addTransactionAction(data));
		dispatch(resetTransactionForm());
	};

	const onEditButton = () => {
		const transaction = transactions[form.index];
		transaction.account = account;
		transaction.changed = {};

		if (typeof form.date !== 'undefined') transaction.changed.date = form.date;
		if (typeof form.investment !== 'undefined') transaction.changed.investment = form.investment;
		if (typeof form.activity !== 'undefined') transaction.changed.activity = form.activity;
		if (typeof form.quantity !== 'undefined') transaction.changed.quantity = Number(form.quantity);
		if (typeof form.price !== 'undefined') transaction.changed.price = Number(form.price);
		if (typeof form.commission !== 'undefined') transaction.changed.commission = Number(form.commission);
		if (typeof form.amount !== 'undefined') transaction.changed.amount = Number(form.amount);

		dispatch(editTransactionAction(transaction));
		dispatch(resetTransactionForm());
	};

	const onDeleteButton = () => {
		const transaction = transactions[form.index];
		transaction.account = account;
		if (typeof form.date !== 'undefined') transaction.date = form.date;
		if (typeof form.investment !== 'undefined') transaction.investment = form.investment;
		if (typeof form.activity !== 'undefined') transaction.activity = form.activity;
		if (typeof form.quantity !== 'undefined') transaction.quantity = form.quantity;
		if (typeof form.price !== 'undefined') transaction.price = form.price;
		if (typeof form.commission !== 'undefined') transaction.commission = form.commission;
		if (typeof form.amount !== 'undefined') transaction.amount = form.amount;

		dispatch(deleteTransactionAction(transaction));
		dispatch(resetTransactionForm());
	};

	const sortedAutocompleteInvestmentList = useMemo(() => {
		const holdings = {};
		if (transactions) {
			transactions.forEach((t) => {
				if (t.investment) {
					if (!holdings[t.investment]) holdings[t.investment] = 0;
					if (t.activity === 'Buy' || t.activity === 'ShrsIn') holdings[t.investment] += t.quantity;
					else if (t.activity === 'Sell' || t.activity === 'ShrsOut') holdings[t.investment] -= t.quantity;
				}
			});
		}
		return [...(autocompleteInvestmentList || [])].sort((a, b) => {
			const aHeld = holdings[a.name] > 0;
			const bHeld = holdings[b.name] > 0;
			if (aHeld && !bHeld) return -1;
			if (!aHeld && bHeld) return 1;
			return a.name.localeCompare(b.name);
		});
	}, [autocompleteInvestmentList, transactions]);

	return (
		<Box component="form" onSubmit={handleSubmit}>
			{/* Date / Investment */}
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
					<Typography sx={fieldLabelSx(T)}>Investment</Typography>
					<AutoComplete
						value={form.investment}
						items={sortedAutocompleteInvestmentList}
						placeholder="Ticker or name"
						onChange={onInvestmentChange(changeInvestment)}
						onInputChange={onInvestmentInputChange(changeInvestment)}
					/>
				</Box>
			</Box>

			{/* Activity chips */}
			<Box sx={{ marginBottom: 2 }}>
				<Typography sx={fieldLabelSx(T)}>Activity</Typography>
				<Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
					{ACTIVITIES.map(({ value, label }) => {
						const active = form.activity === value;
						return (
							<Box
								key={value}
								onClick={() => dispatch(changeActivity(value))}
								sx={{
									padding: '8px 14px',
									fontSize: 12,
									fontWeight: 600,
									borderRadius: '999px',
									background: active ? T.acc.hero : 'transparent',
									color: active ? '#fff' : T.ink,
									border: active ? 'none' : `1px solid ${T.rule}`,
									cursor: 'pointer',
									transition: 'all 0.15s'
								}}
							>
								{label}
							</Box>
						);
					})}
				</Stack>
			</Box>

			{/* Quantity / Price */}
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
				gap: 2,
				marginBottom: 2
			}}>
				<Box>
					<Typography sx={fieldLabelSx(T)}>Quantity</Typography>
					<Box
						component="input"
						type="number"
						placeholder="0"
						value={form.quantity ?? ''}
						onChange={onChange(changeQuantity)}
						disabled={quantityDisabled}
						sx={{ ...inputSx(T), ...sMono }}
					/>
				</Box>
				<Box>
					<Typography sx={fieldLabelSx(T)}>Price</Typography>
					<Box
						component="input"
						type="number"
						placeholder="0"
						value={form.price ?? ''}
						onChange={onChange(changePrice)}
						disabled={priceDisabled}
						sx={{ ...inputSx(T), ...sMono }}
					/>
				</Box>
			</Box>

			{/* Commission / Amount */}
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
				gap: 2,
				marginBottom: 2
			}}>
				<Box>
					<Typography sx={fieldLabelSx(T)}>Commission</Typography>
					<Box
						component="input"
						type="number"
						placeholder="0"
						value={form.commission ?? ''}
						onChange={onChange(changeCommission)}
						disabled={commissionDisabled}
						sx={{ ...inputSx(T), ...sMono }}
					/>
				</Box>
				<Box>
					<Typography sx={fieldLabelSx(T)}>Amount</Typography>
					<Box
						component="input"
						type="number"
						placeholder="0"
						value={form.amount ?? ''}
						onChange={onChange(changeAmount)}
						disabled={amountDisabled}
						required
						sx={{ ...inputSx(T), ...sMono }}
					/>
				</Box>
			</Box>

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

InvestmentTransactionForm.propTypes = {
	account: PropTypes.string.isRequired,
	accountId: PropTypes.string.isRequired,
	autocompleteInvestmentList: PropTypes.array,
	onClose: PropTypes.func,
	transactions: PropTypes.array
};

export default InvestmentTransactionForm;
