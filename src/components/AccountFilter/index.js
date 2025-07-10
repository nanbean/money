import React from 'react';
import PropTypes from 'prop-types';
import FilterMenu from '../FilterMenu'; // Assuming FilterMenu is in ../FilterMenu

export function AccountFilter ({
	allAccounts,
	filteredAccounts,
	setfilteredAccounts
}) {
	const options = allAccounts.map(account => ({ label: account, value: account }));

	return (
		<FilterMenu
			filterName="Filter"
			options={options}
			selectedOptions={filteredAccounts}
			onSelectionChange={setfilteredAccounts}
			showAllOption
			allOptionLabel="All"
		/>
	);
}

AccountFilter.propTypes = {
	allAccounts: PropTypes.array.isRequired,
	filteredAccounts: PropTypes.array.isRequired,
	setfilteredAccounts: PropTypes.func.isRequired
};

export default AccountFilter;