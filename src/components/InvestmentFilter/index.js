import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import FilterMenu from '../FilterMenu'; // Assuming FilterMenu is in ../FilterMenu
import { setfilteredInvestments } from '../../actions/investmentActions';

export function InvestmentFilter ({
	allInvestments,
	filteredInvestments
}) {
	const dispatch = useDispatch();
	const options = allInvestments.map(inv => ({ label: inv, value: inv }));

	const handleSelectionChange = (newSelection) => {
		dispatch(setfilteredInvestments(newSelection));
	};

	return (
		<FilterMenu
			filterName="Filter"
			options={options}
			selectedOptions={filteredInvestments}
			onSelectionChange={handleSelectionChange}
			showAllOption
			allOptionLabel="All"
		/>
	);
}

InvestmentFilter.propTypes = {
	allInvestments: PropTypes.array.isRequired,
	filteredInvestments: PropTypes.array.isRequired
};

export default InvestmentFilter;