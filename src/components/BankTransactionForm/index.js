import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';

import _ from 'lodash';

import AutoComplete from '../AutoComplete';

import {
	fillTransactionForm,
	resetTransactionForm,
	changeDate,
	changePayee,
	changeCategory,
	changeAmount,
	changeMemo
} from '../../actions/ui/form/bankTransaction';

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

class BankTransactionForm extends React.Component {
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

	onPayeeChange = handler => (event, value) => handler(value)

	onPayeeSelect = handler => (event, value) => {
		const { transactions, form } = this.props;
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

		return handler(transaction);
	}

	onAddButton = () => {
		const data = {};
		const { account, accountId, form } = this.props;
		const categoryArray = form.category.split(':');

		data.account = form.account || account;
		data.accountId = accountId;
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

		this.props.addTransactionAction(data);
		this.props.resetTransactionForm();
	}

	onEditButton = () => {
		const { account, form, transactions } = this.props;
		const transaction = transactions[form.index];
		const categoryArray = form.category.split(':');

		transaction.account = form.account || account;
		transaction.changed = {};

		if (transaction.date !== form.date) {
			transaction.changed.date = form.date;
		}
		if (transaction.payee !== form.payee) {
			transaction.changed.payee = form.payee;
		}
		if (transaction.amount !== form.amount) {
			transaction.changed.amount = Number(form.amount);
		}
		if (transaction.memo !== form.memo) {
			transaction.changed.memo = form.memo;
		}
		if (categoryArray[0] && transaction.category !== categoryArray[0]) {
			transaction.changed.category = categoryArray[0];
		}
		if (categoryArray[1] && transaction.subcategory !== categoryArray[1]) {
			transaction.changed.subcategory = categoryArray[1];
		}
		if (!categoryArray[1]) {
			transaction.changed.subcategory = '';
		}

		this.props.editTransactionAction(transaction);
		this.props.resetTransactionForm();
	}

	onDeleteButton = handler => () => {
		const { account, form, transactions } = this.props;
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

		handler(transaction);
		this.props.resetTransactionForm();
	}

	render () {
		const { classes, form, dropCategoryList, dropPayeeList } = this.props;

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
							autoComplete="off"
							autoFocus
							placeholder="Date"
							value={form.date}
							fullWidth
							onChange={this.onChange(this.props.changeDate)}
						/>
					</FormControl>
					<FormControl required fullWidth>
						<AutoComplete
							value={form.payee}
							items={dropPayeeList}
							placeholder="Payee"
							onInputChange={this.onPayeeChange(this.props.changePayee)}
							onChange={this.onPayeeSelect(this.props.fillTransactionForm)}
						/>
					</FormControl>
					<FormControl required fullWidth>
						<Select
							value={form.category}
							onChange={this.onChange(this.props.changeCategory)}
						>
							{
								dropCategoryList.map(i => (
									<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
								))
							}
						</Select>
					</FormControl>
					<FormControl required fullWidth>
						<Input
							id="amount"
							type="number"
							name="amount"
							autoComplete="off"
							placeholder="Amount"
							fullWidth
							value={form.amount}
							onChange={this.onChange(this.props.changeAmount)}
						/>
					</FormControl>
					<FormControl fullWidth>
						<Input
							id="memo"
							name="memo"
							placeholder="Memo"
							value={form.memo}
							onChange={this.onChange(this.props.changeMemo)}
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

BankTransactionForm.propTypes = {
	accountId: PropTypes.string.isRequired,
	classes: PropTypes.object.isRequired,
	account: PropTypes.string,
	addTransactionAction: PropTypes.func,
	changeAmount: PropTypes.func,
	changeCategory: PropTypes.func,
	changeDate: PropTypes.func,
	changeMemo: PropTypes.func,
	changePayee: PropTypes.func,
	deleteTransactionAction: PropTypes.func,
	dropCategoryList: PropTypes.array,
	dropPayeeList: PropTypes.array,
	editTransactionAction: PropTypes.func,
	fillTransactionForm: PropTypes.func,
	form: PropTypes.shape({
		account: PropTypes.string,
		date: PropTypes.string,
		payee: PropTypes.string,
		category: PropTypes.string,
		amount: PropTypes.oneOfType([
			PropTypes.string,
			PropTypes.number
		]),
		memo: PropTypes.string
	}),
	resetTransactionForm: PropTypes.func,
	transactions: PropTypes.array
};

const mapStateToProps = state => ({
	form: state.ui.form.bankTransaction
});

export default connect(mapStateToProps, {
	fillTransactionForm,
	resetTransactionForm,
	changeDate,
	changePayee,
	changeCategory,
	changeAmount,
	changeMemo
})(withStyles(styles)(BankTransactionForm));
