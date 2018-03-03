import React from 'react'
import PropTypes from 'prop-types'
import { Modal, Header } from 'semantic-ui-react'

const BankTransactionModal = props => (
	<Modal
		closeIcon
		size="small"
		className="transaction"
		open={props.isOpen}
		onClose={props.resetTransactionForm}
	>
		<Header
			icon="file text outline"
			content={props.isEdit ? 'Edit Transaction' : 'New Transaction'}
		/>
		<Modal.Content scrolling>
			<props.EditForm
				account={props.account}
				transactions={props.transactions}
				dropCategoryList={props.dropCategoryList}
				dropPayeeList={props.dropPayeeList}
				addTransactionAction={props.addTransactionAction}
				deleteTransactionAction={props.deleteTransactionAction}
				editTransactionAction={props.editTransactionAction}
			/>
		</Modal.Content>
	</Modal>
)

BankTransactionModal.propTypes = {
	isOpen: PropTypes.bool,
	isEdit: PropTypes.bool,
	account: PropTypes.string,
	transactions: PropTypes.array,
	dropCategoryList: PropTypes.array,
	dropPayeeList: PropTypes.array,
	resetTransactionForm: PropTypes.func,
	addTransactionAction: PropTypes.func,
	deleteTransactionAction: PropTypes.func,
	editTransactionAction: PropTypes.func,
	EditForm: PropTypes.func
}

export default BankTransactionModal
