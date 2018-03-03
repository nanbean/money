import { createActions } from 'redux-actions'

export const {
	fillTransactionForm,
	resetTransactionForm,
	openTransactionInModal,
	changeDate,
	changePayee,
	changeCategory,
	changeAmount,
	changeMemo
} = createActions(
	'FILL_TRANSACTION_FORM',
	'RESET_TRANSACTION_FORM',
	'OPEN_TRANSACTION_IN_MODAL',
	'CHANGE_DATE',
	'CHANGE_PAYEE',
	'CHANGE_CATEGORY',
	'CHANGE_AMOUNT',
	'CHANGE_MEMO'
)
