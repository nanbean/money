import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

import moment from 'moment';
import _ from 'lodash';

import DividendGrid from '../components/DividendGrid';
import AccountFilter from '../components/AccountFilter';

const startYear = 2005;
const endYear = parseInt(moment().format('YYYY'), 10);
const yearOptions = Array.from({ length: endYear - startYear + 1 }, (v, k) => k + startYear).map(i => ({ key: i, value: i, text: i }));

const styles = theme => ({
	header: {
		paddingTop: theme.spacing(1),
		[theme.breakpoints.down('sm')]: {
			paddingTop: 0
		}
	}
});

class Dividend extends Component {
	state = {
		year: parseInt(moment().format('YYYY'), 10),
		filteredAccounts: []
	}

	onYearChange = event => {
		this.setState({
			year: event.target.value
		});
	}

	onFilteredAccountsChange = (e) => {
		this.setState({
			filteredAccounts: e
		});
	}

	render () {
		const { allAccountsTransactions, classes } = this.props;
		const { filteredAccounts, year } = this.state;
		const startDate = moment().year(year).startOf('year').format('YYYY-MM-DD');
		const endDate = moment().year(year).endOf('year').format('YYYY-MM-DD');
		const dividendTransactions = allAccountsTransactions.filter(i => i.activity === 'Div' || i.activity === 'MiscExp')
			.filter(i => i.date >= startDate && i.date <= endDate);
		const allAccounts = Object.keys(_.groupBy(dividendTransactions, 'account')).map(account => account);

		const dividendData = [];
		_.forEach(_.groupBy(dividendTransactions.filter(i => filteredAccounts.includes(i.account)), 'account'), (value, key) => {
			dividendData.push([
				key,
				value.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ),
				value.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ),
				(value.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ) -
				value.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ))
			]);
		});

		const dividendGridata = [
			[
				'Account',
				'Dividend',
				'Tax',
				'Gain'
			],
			...dividendData,
			[
				'Total',
				dividendData.map(i => i[1]).reduce( (prev, curr) => prev + curr, 0 ),
				dividendData.map(i => i[2]).reduce( (prev, curr) => prev + curr, 0 ),
				dividendData.map(i => i[3]).reduce( (prev, curr) => prev + curr, 0 )
			]
		];

		return (
			<div>
				<div className={classes.header}>
					<FormControl fullWidth>
						<Select
							value={year}
							onChange={this.onYearChange}
							inputProps={{
								name: 'year',
								id: 'year-select'
							}}
						>
							{
								yearOptions.map(i => (
									<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
								))
							}
						</Select>
					</FormControl>
					{/* <Dropdown
						fluid
						placeholder="Year"
						value={year}
						search
						selection
						options={yearOptions}
						onChange={this.onYearChange}
					/> */}
					<AccountFilter
						allAccounts={allAccounts}
						filteredAccounts={filteredAccounts}
						setfilteredAccounts={this.onFilteredAccountsChange}
					/>
				</div>
				<DividendGrid
					dividendGridata={dividendGridata}
				/>
			</div>
		);
	}
}

Dividend.propTypes = {
	allAccountsTransactions: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions
});

export default connect(
	mapStateToProps,
	null
)(withStyles(styles)(Dividend));
