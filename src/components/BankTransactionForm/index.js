import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Form, Button, Dropdown, Input, Segment } from 'semantic-ui-react';
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

import './index.css';

class BankTransactionForm extends React.Component {
	onChange = handler => (event, { value }) => handler(value)

	onPayeeChange = handler => (event, value) => handler(value)

	onPayeeSelect = handler => (val) => {
		const { transactions, form } = this.props;
		const matchIndex = _.findLastIndex(transactions, i => i.payee === val);
		const matchTransaction = matchIndex >= 0 && transactions[matchIndex];
		const transaction = {
			payee: val
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

	onAddButton = handler => () => {
		const data = {};
		const { account, form } = this.props;
		const categoryArray = form.category.split(':');

		data.account = form.account || account;
		data.date = form.date;
		data.payee = form.payee;
		data.category = form.category;
		data.amount = form.amount;
		if (form.memo) {
			data.memo = form.memo;
		}

		if (categoryArray[0]) {
			data.category = categoryArray[0];
		}

		if (categoryArray[1]) {
			data.subcategory = categoryArray[1];
		}

		handler(data);
		this.props.resetTransactionForm();
	}

	onEditButton = handler => () => {
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
			transaction.changed.amount = form.amount;
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

		handler(transaction);
		this.props.resetTransactionForm();
	}

	onDeleteButton = handler => () => {
		const transaction = {};
		const { account, form } = this.props;
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
		const { form, dropCategoryList, dropPayeeList } = this.props;

		return (
			<div>
				<Segment attached="bottom">
					<Form className="bank-transaction-form">
						<Input
							fluid
							type="date"
							placeholder="Date"
							value={form.date}
							onChange={this.onChange(this.props.changeDate)}
						/>
						<AutoComplete
							value={form.payee}
							items={dropPayeeList}
							placeholder="Payee"
							onChange={this.onPayeeChange(this.props.changePayee)}
							onSelect={this.onPayeeSelect(this.props.fillTransactionForm)}
						/>
						<Dropdown
							fluid
							placeholder="Category"
							value={form.category}
							search
							selection
							options={dropCategoryList}
							onChange={this.onChange(this.props.changeCategory)}
						/>
						<Input
							fluid
							type="number"
							placeholder="Amount"
							value={form.amount}
							onChange={this.onChange(this.props.changeAmount)}
						/>
						<Input
							fluid
							placeholder="Memo"
							value={form.memo}
							onChange={this.onChange(this.props.changeMemo)}
						/>
						<Button
							primary
							fluid
							onClick={form.isEdit ? this.onEditButton(this.props.editTransactionAction) : this.onAddButton(this.props.addTransactionAction)}
						>
							{form.isEdit ? 'Edit' : 'Add'}
						</Button>
						{
							form.isEdit &&
							<Button
								negative
								fluid
								onClick={this.onDeleteButton(this.props.deleteTransactionAction)}
							>
								Delete
							</Button>
						}
					</Form>
				</Segment>
			</div>
		);
	}
}

BankTransactionForm.propTypes = {
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
		amount: PropTypes.number,
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
})(BankTransactionForm);
