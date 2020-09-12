import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';

import AutoComplete from '../AutoComplete';

import {
	fillTransactionForm,
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
	{ key: 'Buy', value: 'Buy', text: 'Buy' },
	{ key: 'Sell', value: 'Sell', text: 'Sell' },
	{ key: 'Div', value: 'Div', text: 'Div' },
	{ key: 'ShrsOut', value: 'ShrsOut', text: 'ShrsOut' },
	{ key: 'ShrsIn', value: 'ShrsIn', text: 'ShrsIn' },
	{ key: 'MiscExp', value: 'MiscExp', text: 'MiscExp' }
];

const styles = theme => ({
	paper: {
		marginTop: theme.spacing.unit * 8,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 3}px ${theme.spacing.unit * 3}px`
	},
	form: {
		width: '100%' // Fix IE 11 issue.
	},
	submit: {
		marginTop: theme.spacing.unit
	},
	help: {
		color: 'red'
	}
});

class InvestmentTransactionForm extends React.Component {
	handleSubmit = (event) => {
		event.preventDefault();
		const { form } = this.props;

		if (form.isEdit) {
			this.onEditButton();
		} else {
			this.onAddButton();
		}
	}

	onChange = handler => event => handler(event.target.value)

	onInvestmentChange = handler => (event, value) => handler(value.name)

	onAddButton = () => {
		const data = {};
		const { account, accountId, form } = this.props;

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

		this.props.addTransactionAction(data);
		this.props.resetTransactionForm();
	}

	onEditButton = () => {
		const { account, form, transactions } = this.props;
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

		this.props.editTransactionAction(transaction);
		this.props.resetTransactionForm();
	}

	onDeleteButton = handler => () => {
		const { account, form, transactions } = this.props;
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

		handler(transaction);
		this.props.resetTransactionForm();
	}

	render () {
		const { classes, form, autocompleteInvestmentList } = this.props;
		const quantityDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp';
		const priceDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp' || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';
		const commissionDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp' || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';
		const amountDisabled = !form.activity || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';

		return (
			<div>
				<form
					className={classes.form}
					onSubmit={this.handleSubmit}
				>
					<FormControl required fullWidth>
						<Input
							id="date"
							type="date"
							name="date"
							placeholder="Date"
							value={form.date}
							onChange={this.onChange(this.props.changeDate)}
						/>
					</FormControl>
					<AutoComplete
						value={form.investment}
						items={autocompleteInvestmentList}
						placeholder="Investment"
						onChange={this.onInvestmentChange(this.props.changeInvestment)}
					/>
					<FormControl required fullWidth>
						<Select
							value={form.activity}
							onChange={this.onChange(this.props.changeActivity)}
							inputProps={{
								name: 'activity',
								id: 'activity-select'
							}}
						>
							{
								activityList.map(i => (
									<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
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
							onChange={this.onChange(this.props.changeQuantity)}
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
							onChange={this.onChange(this.props.changePrice)}
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
							onChange={this.onChange(this.props.changeCommission)}
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
							onChange={this.onChange(this.props.changeAmount)}
						/>
					</FormControl>
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="primary"
						className={classes.submit}
					>
						{form.isEdit ? 'Edit' : 'Add'}
					</Button>
					{
						form.isEdit &&
							<Button
								fullWidth
								variant="contained"
								color="secondary"
								className={classes.submit}
								onClick={this.onDeleteButton(this.props.deleteTransactionAction)}
							>
								Delete
							</Button>
					}
				</form>
			</div>
		);
	}
}

InvestmentTransactionForm.propTypes = {
	account: PropTypes.string.isRequired,
	accountId: PropTypes.string.isRequired,
	classes: PropTypes.object.isRequired,
	addTransactionAction: PropTypes.func,
	autocompleteInvestmentList: PropTypes.array,
	changeActivity: PropTypes.func,
	changeAmount: PropTypes.func,
	changeCommission: PropTypes.func,
	changeDate: PropTypes.func,
	changeInvestment: PropTypes.func,
	changePrice: PropTypes.func,
	changeQuantity: PropTypes.func,
	deleteTransactionAction: PropTypes.func,
	editTransactionAction: PropTypes.func,
	fillTransactionForm: PropTypes.func,
	form: PropTypes.shape({
		date: PropTypes.string,
		investment: PropTypes.string,
		activity: PropTypes.string,
		quantity: PropTypes.number,
		price: PropTypes.number,
		commission: PropTypes.number,
		amount: PropTypes.oneOfType([
			PropTypes.string,
			PropTypes.number
		])
	}),
	resetTransactionForm: PropTypes.func,
	transactions: PropTypes.array
};

const mapStateToProps = state => ({
	form: state.ui.form.investmentTransaction
});

export default connect(mapStateToProps, {
	fillTransactionForm,
	resetTransactionForm,
	changeDate,
	changeInvestment,
	changeActivity,
	changeQuantity,
	changePrice,
	changeCommission,
	changeAmount
})(withStyles(styles)(InvestmentTransactionForm));
