import {createActions} from 'redux-actions';

export const {
	fillTransactionForm,
	resetTransactionForm,
	openTransactionInModal,
	changeDate,
	changeInvestment,
	changeActivity,
	changeQuantity,
	changePrice,
	changeCommission,
	changeAmount
} = createActions(
	'FILL_TRANSACTION_FORM',
	'RESET_TRANSACTION_FORM',
	'OPEN_TRANSACTION_IN_MODAL',
	'CHANGE_DATE',
	'CHANGE_INVESTMENT',
	'CHANGE_ACTIVITY',
	'CHANGE_QUANTITY',
	'CHANGE_PRICE',
	'CHANGE_COMMISSION',
	'CHANGE_AMOUNT'
);
