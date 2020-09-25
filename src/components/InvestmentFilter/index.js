import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Paper from '@material-ui/core/Paper';

const styles = theme => ({
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing(2)
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		alignItems: 'center',
		padding: theme.spacing(2)
	},
	item: {
		display: 'inline-block'
	},
	checkBox: {
		padding: theme.spacing(1) / 2
	}
});

class InvestmentFilter extends Component {
	onFilteredInvestmentsChange = name => event => {
		const { filteredInvestments } = this.props;
		const checked = event.target.checked;

		const findIndex = filteredInvestments.findIndex(i => i === name);

		if ( checked === true) {
			if (findIndex >= 0) {
				// do nothing
			} else {
				this.props.setfilteredInvestments([
					...filteredInvestments,
					name
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
		const allInvestments = allInvestmentsPrice.map(j => j.name);

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
			allInvestmentsPrice,
			classes,
			filteredInvestments
		} = this.props;

		return (
			<Paper className={classes.paper}>
				{
					allInvestmentsPrice && allInvestmentsPrice.map(j => {
						return (
							<div key={j.name} className={classes.item}>
								<FormControlLabel
									control={
										<Checkbox className={classes.checkBox} size="small" checked={filteredInvestments.find(q => q === j.name) ? true : false} onChange={this.onFilteredInvestmentsChange(j.name)}/>
									}
									label={j.name}
								/>
							</div>
						);
					})
				}
				<FormControlLabel
					control={
						<Checkbox key="All" className={classes.checkBox} size="small" checked={filteredInvestments.length === allInvestmentsPrice.length} onClick={this.onAllInvestementClick}/>
					}
					label="All"
				/>
			</Paper>
		);
	}
}

InvestmentFilter.propTypes = {
	allInvestmentsPrice: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	setfilteredInvestments: PropTypes.func.isRequired
};

export default withStyles(styles)(InvestmentFilter);
