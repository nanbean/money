import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

import moment from 'moment';
import _ from 'lodash';

import DividendGrid from '../components/DividendGrid';
import AccountFilter from '../components/AccountFilter';

import { getAllDividendsAction } from '../actions/dividendActions';

const startYear = 2005;
const endYear = parseInt(moment().format('YYYY'), 10);
const yearOptions = Array.from({ length: endYear - startYear + 1 }, (v, k) => k + startYear).map(i => ({ key: i, value: i, text: i }));

const styles = theme => ({
	sticky: {
		padding: '1em',
		width: '100%',
		position: 'sticky',
		[theme.breakpoints.up('lg')]: {
			top: 62
		},
		[theme.breakpoints.down('sm')]: {
			top: 56
		}
	}
});

class Dividend extends Component {
	state = {
		year: parseInt(moment().format('YYYY'), 10),
		filteredAccounts: []
	}

	componentDidMount () {
		this.props.getAllDividendsAction();
	}

	componentDidUpdate (prevProps) {
		if (!_.isEqual(prevProps.allDividends, this.props.allDividends)) {
			this.setState({
				filteredAccounts: this.props.allDividends.map(i => i.account)
			});
		}
	}

	onYearChange = event => {
		this.setState({
			year: event.target.value
		});
		this.props.getAllDividendsAction(moment().year(event.target.value).startOf('year').format('YYYY-MM-DD'), moment().year(event.target.value).endOf('year').format('YYYY-MM-DD'));
	}

	onFilteredAccountsChange = (e) => {
		this.setState({
			filteredAccounts: e
		});
	}

	render () {
		const { allDividends, classes, dividendFetching } = this.props;
		const { filteredAccounts, year } = this.state;
		const allAccounts = allDividends.map(i => i.account);
		const dividendData = allDividends.filter(i => filteredAccounts.includes(i.account)).map(i => {
			return [
				i.account,
				i.transactions.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ),
				i.transactions.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ),
				(i.transactions.filter(i => i.activity === 'Div').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ) -
				i.transactions.filter(i => i.activity === 'MiscExp').map((l) => l.amount).reduce( (prev, curr) => prev + curr, 0 ))
			];
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

		if (dividendFetching) {
			return <CircularProgress />;
		}
		return (
			<div>
				<div className={classes.sticky}>
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
	allDividends:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	dividendFetching: PropTypes.bool.isRequired,
	getAllDividendsAction: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	dividendFetching: state.ui.dividend.fetching,
	allDividends: state.allDividends
});

const mapDispatchToProps = dispatch => ({
	getAllDividendsAction (start, end) {
		dispatch(getAllDividendsAction(start, end));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Dividend));
