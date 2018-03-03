import React from 'react'
import PropTypes from 'prop-types'
import { Modal, Header } from 'semantic-ui-react'

const InvestmentTransactionModal = props => (
	<Modal
		closeIcon
		size="small"
		className="transaction"
		open={props.isOpen}
		onClose={props.resetTransactionForm}
	>
		<Header
			as='h4'
			icon="file text outline"
			content={props.isEdit ? 'Edit Transaction' : 'New Transaction'}
		/>
		<Modal.Content scrolling>
			<props.EditForm
				account={props.account}
				investmentAccountTransactions={props.investmentAccountTransactions}
				autocompleteInvestmentList={props.autocompleteInvestmentList}
				addInvestmentTransactionAction={props.addInvestmentTransactionAction}
				deleteInvestmentTransactionAction={props.deleteInvestmentTransactionAction}
				editInvestmentTransactionAction={props.editInvestmentTransactionAction}
			/>
		</Modal.Content>
	</Modal>
)

InvestmentTransactionModal.propTypes = {
	isOpen: PropTypes.bool,
	isEdit: PropTypes.bool,
	account: PropTypes.string,
	investmentAccountTransactions: PropTypes.array,
	autocompleteInvestmentList: PropTypes.array,
	resetTransactionForm: PropTypes.func,
	addInvestmentTransactionAction: PropTypes.func,
	deleteInvestmentTransactionAction: PropTypes.func,
	editInvestmentTransactionAction: PropTypes.func,
	EditForm: PropTypes.func
}

export default InvestmentTransactionModal
