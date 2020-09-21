import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

const styles = theme => ({
	filter: {
		padding: 5
	},
	item: {
		display: 'inline-block'
	},
	checkBox: {
		padding: theme.spacing(1) / 2
	}
});

class AccountFilter extends Component {
	onFilteredAccountsChange = account => event => {
		const { filteredAccounts } = this.props;
		const checked = event.target.checked;

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

	onAllAccountClick = event => {
		const checked = event.target.checked;
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
		const { allAccounts, classes, filteredAccounts } = this.props;

		return (
			<div className={classes.filter}>
				{
					allAccounts && allAccounts.map(j => {
						return (
							<div key={j} className={classes.item}>
								<FormControlLabel
									control={
										<Checkbox className={classes.checkBox} size="small" checked={filteredAccounts.find(q => q === j) ? true : false} onChange={this.onFilteredAccountsChange(j)}/>
									}
									label={j}
								/>
							</div>
						);
					})
				}
				<FormControlLabel
					control={
						<Checkbox key="All" className={classes.checkBox} size="small" checked={allAccounts.length === filteredAccounts.length} onClick={this.onAllAccountClick}/>
					}
					label="All"
				/>
			</div>
		);
	}
}

AccountFilter.propTypes = {
	allAccounts: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	filteredAccounts: PropTypes.array.isRequired,
	setfilteredAccounts: PropTypes.func.isRequired
};

export default  withStyles(styles)(AccountFilter);
