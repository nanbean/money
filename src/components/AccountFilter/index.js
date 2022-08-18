import React from 'react';
import PropTypes from 'prop-types';

import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

export function AccountFilter ({
	allAccounts,
	filteredAccounts,
	setfilteredAccounts
}) {
	const onFilteredAccountsChange = account => event => {
		const checked = event.target.checked;
		const findIndex = filteredAccounts.findIndex(i => i === account);

		if ( checked === true) {
			if (findIndex >= 0) {
				// do nothing
			} else {
				setfilteredAccounts([
					...filteredAccounts,
					account
				]);
			}
		} else if (findIndex >= 0) {
			setfilteredAccounts([
				...filteredAccounts.slice(0, findIndex),
				...filteredAccounts.slice(findIndex + 1)
			]);
		} else {
			// do nothing
		}
	};

	const onAllAccountClick = event => {
		const checked = event.target.checked;

		if ( checked === true) {
			setfilteredAccounts([
				...allAccounts
			]);
		} else {
			setfilteredAccounts([
			]);
		}
	};

	return (
		<div style={{ padding: 5 }}>
			{
				allAccounts && allAccounts.map(j => {
					return (
						<div key={j} style={{ display: 'inline-block' }}>
							<FormControlLabel
								control={
									<Checkbox size="small" checked={filteredAccounts.find(q => q === j) ? true : false} onChange={onFilteredAccountsChange(j)}/>
								}
								label={j}
							/>
						</div>
					);
				})
			}
			<FormControlLabel
				control={
					<Checkbox key="All" size="small" checked={allAccounts.length === filteredAccounts.length} onClick={onAllAccountClick}/>
				}
				label="All"
			/>
		</div>
	);
}

AccountFilter.propTypes = {
	allAccounts: PropTypes.array.isRequired,
	filteredAccounts: PropTypes.array.isRequired,
	setfilteredAccounts: PropTypes.func.isRequired
};

export default AccountFilter;
