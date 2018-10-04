import React from 'react';
import PropTypes from 'prop-types';
import {Modal, Header} from 'semantic-ui-react';

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
);

BankTransactionModal.propTypes = {
	account: PropTypes.string,
	addTransactionAction: PropTypes.func,
	deleteTransactionAction: PropTypes.func,
	dropCategoryList: PropTypes.array,
	dropPayeeList: PropTypes.array,
	EditForm: PropTypes.func,
	editTransactionAction: PropTypes.func,
	isEdit: PropTypes.bool,
	isOpen: PropTypes.bool,
	resetTransactionForm: PropTypes.func,
	transactions: PropTypes.array
};

export default BankTransactionModal;
