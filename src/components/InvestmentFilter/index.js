import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

const styles = theme => ({
	filter: {
		padding: theme.spacing.unit * 3
	},
	item: {
		display: 'inline-block'
	},
	checkBox: {
		padding: theme.spacing.unit
	}
});

class InvestmentFilter extends Component {
	onFilteredInvestmentsChange = investment => event => {
		const { filteredInvestments } = this.props;
		const checked = event.target.checked;

		const findIndex = filteredInvestments.findIndex(i => i === investment);

		if ( checked === true) {
			if (findIndex >= 0) {
				// do nothing
			} else {
				this.props.setfilteredInvestments([
					...filteredInvestments,
					investment
				]);
			}
		} else if (findIndex >= 0) {
			this.props.setfilteredInvestments([
				...filteredInvestments.slice(0, findIndex),
				...filteredInvestments.slice(findIndex + 1)
			]);
		} else {
			// do nothing
		}
	}

	onAllInvestementClick = event => {
		const checked = event.target.checked;
		const { allInvestmentsPrice } = this.props;
		const allInvestments = allInvestmentsPrice.map(j => j.investment);

		if ( checked === true) {
			this.props.setfilteredInvestments([
				...allInvestments
			]);
		} else {
			this.props.setfilteredInvestments([
			]);
		}
	}

	render () {
		const {
			allInvestmentsFiltered,
			allInvestmentsPrice,
			classes,
			filteredInvestments
		} = this.props;

		return (
			<div className={classes.filter}>
				{
					allInvestmentsPrice && allInvestmentsPrice.map(j => {
						return (
							<div key={j.investment} className={classes.item}>
								<FormControlLabel
									control={
										<Checkbox className={classes.checkBox} checked={filteredInvestments.find(q => q === j.investment) ? true : false} onChange={this.onFilteredInvestmentsChange(j.investment)}/>
									}
									label={j.investment}
								/>
							</div>
						);
					})
				}
				<FormControlLabel
					control={
						<Checkbox key="All" checked={allInvestmentsFiltered} onClick={this.onAllInvestementClick}/>
					}
					label="All"
				/>
			</div>
		);
	}
}

InvestmentFilter.propTypes = {
	allInvestmentsFiltered: PropTypes.bool.isRequired,
	allInvestmentsPrice: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	setfilteredInvestments: PropTypes.func.isRequired
};

export default withStyles(styles)(InvestmentFilter);
