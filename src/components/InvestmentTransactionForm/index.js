import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Form, Button, Dropdown, Input, Segment } from 'semantic-ui-react';

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

class InvestmentTransactionForm extends React.Component {
	onChange = handler => (event, { value }) => handler(value)

	onInvestmentChange = handler => (event, value) => handler(value)

	onInvestmentSelect = handler => (value) => handler(value)

	onAddButton = handler => () => {
		const data = {};
		const { account, form } = this.props;

		data.account = account;
		data.date = form.date;
		data.investment = form.investment;
		data.activity = form.activity;
		data.quantity = form.quantity;
		data.price = form.price;
		if (form.commission) {
			data.commission = form.commission;
		}
		data.amount = form.amount;

		handler(data);
		this.props.resetTransactionForm();
	}

	onEditButton = handler => () => {
		const { account, form, investmentAccountTransactions } = this.props;
		const transaction = investmentAccountTransactions[form.index];

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
			transaction.changed.quantity = form.quantity;
		}
		if (typeof form.price !== 'undefined') {
			transaction.changed.price = form.price;
		}
		if (typeof form.commission !== 'undefined') {
			transaction.changed.commission = form.commission;
		}
		if (typeof form.amount !== 'undefined') {
			transaction.changed.amount = form.amount;
		}

		handler(transaction);
		this.props.resetTransactionForm();
	}

	onDeleteButton = handler => () => {
		const transaction = {};
		const { account, form } = this.props;

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

	render() {
		const { form, autocompleteInvestmentList } = this.props;
		const quantityDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp';
		const priceDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp' || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';
		const commissionDisabled = !form.activity || form.activity === 'Div' || form.activity === 'MiscExp' || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';
		const amountDisabled = !form.activity || form.activity === 'ShrsOut' || form.activity === 'ShrsIn';

		return (
			<div>
				<Segment attached="bottom">
					<Form className="investment-transaction-form">
						<Input
							fluid
							type="date"
							placeholder="Date"
							value={form.date}
							onChange={this.onChange(this.props.changeDate)}
						/>
						<AutoComplete
							value={form.investment}
							items={autocompleteInvestmentList}
							placeholder="Investment"
							onChange={this.onInvestmentChange(this.props.changeInvestment)}
							onSelect={this.onInvestmentSelect(this.props.changeInvestment)}
						/>
						<Dropdown
							fluid
							placeholder="Activity"
							value={form.activity}
							search
							selection
							options={activityList}
							onChange={this.onChange(this.props.changeActivity)}
						/>
						<Input
							fluid
							type="number"
							placeholder="Quantity"
							value={form.quantity}
							disabled={quantityDisabled}
							onChange={this.onChange(this.props.changeQuantity)}
						/>
						<Input
							fluid
							type="number"
							placeholder="Price"
							value={form.price}
							disabled={priceDisabled}
							onChange={this.onChange(this.props.changePrice)}
						/>
						<Input
							fluid
							type="number"
							placeholder="Commission"
							value={form.commission}
							disabled={commissionDisabled}
							onChange={this.onChange(this.props.changeCommission)}
						/>
						<Input
							fluid
							type="number"
							placeholder="Amount"
							value={form.amount}
							disabled={amountDisabled}
							onChange={this.onChange(this.props.changeAmount)}
						/>
						<Button
							primary
							fluid
							onClick={form.isEdit ? this.onEditButton(this.props.editInvestmentTransactionAction) : this.onAddButton(this.props.addInvestmentTransactionAction)}
						>
							{form.isEdit ? 'Edit' : 'Add'}
						</Button>
						{
							form.isEdit &&
							<Button
								negative
								fluid
								onClick={this.onDeleteButton(this.props.deleteInvestmentTransactionAction)}
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

InvestmentTransactionForm.propTypes = {
	account: PropTypes.string,
	addInvestmentTransactionAction: PropTypes.func,
	autocompleteInvestmentList: PropTypes.array,
	changeActivity: PropTypes.func,
	changeAmount: PropTypes.func,
	changeCommission: PropTypes.func,
	changeDate: PropTypes.func,
	changeInvestment: PropTypes.func,
	changePrice: PropTypes.func,
	changeQuantity: PropTypes.func,
	deleteInvestmentTransactionAction: PropTypes.func,
	editInvestmentTransactionAction: PropTypes.func,
	fillTransactionForm: PropTypes.func,
	form: PropTypes.shape({
		date: PropTypes.string,
		investment: PropTypes.string,
		activity: PropTypes.string,
		quantity: PropTypes.number,
		price: PropTypes.number,
		commission: PropTypes.number,
		amount: PropTypes.number
	}),
	investmentAccountTransactions: PropTypes.array,
	resetTransactionForm: PropTypes.func
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
})(InvestmentTransactionForm);
