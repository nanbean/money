import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from 'semantic-ui-react';

import './index.css';

class AccountFilter extends Component {
	onFilteredAccountsChange = (e, data) => {
		const { filteredAccounts } = this.props;
		const account = data.label;
		const checked = data.checked;

		const findIndex = filteredAccounts.findIndex(i => i === account);

		if ( checked === true) {
			if (findIndex >= 0) {
				// do nothing
			} else {
				this.props.setfilteredAccounts([
					...filteredAccounts,
					account
				]);
			}
		} else if (findIndex >= 0) {
			this.props.setfilteredAccounts([
				...filteredAccounts.slice(0, findIndex),
				...filteredAccounts.slice(findIndex + 1)
			]);
		} else {
			// do nothing
		}
	}

	onAllAccountClick = (e, data) => {
		const checked = data.checked;
		const { allAccounts } = this.props;

		if ( checked === true) {
			this.props.setfilteredAccounts([
				...allAccounts
			]);
		} else {
			this.props.setfilteredAccounts([
			]);
		}
	}

	render () {
		const { allAccounts, filteredAccounts } = this.props;

		return (
			<div className="account-filter">
				{
					allAccounts && allAccounts.map(j => {
						return (
							<div key={j} className="account-filter-checkbox">
								<Checkbox label={j} checked={filteredAccounts.find(q => q === j) ? true : false} onChange={this.onFilteredAccountsChange}/>
							</div>
						);
					})
				}
				<Checkbox key="All" label="All" checked={allAccounts.length === filteredAccounts.length} onClick={this.onAllAccountClick}/>
			</div>
		);
	}
}

AccountFilter.propTypes = {
	allAccounts: PropTypes.array.isRequired,
	filteredAccounts: PropTypes.array.isRequired,
	setfilteredAccounts: PropTypes.func.isRequired
};

export default AccountFilter;
