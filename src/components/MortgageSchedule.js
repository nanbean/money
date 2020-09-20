import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import moment from 'moment';

import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import TableCell from '../components/TableCell';

const styles = () => ({

});

class MortgageSchedule extends Component {
	componentDidMount () {
		this.props.getMortgageScheduleAction();
	}

	onAddClick = no => () => {
		const { mortgageSchedule } = this.props;
		const schedule = mortgageSchedule[no - 1];
		const amountData = {};
		const interestData = {};

		amountData.account = '아낌이모기지론';
		amountData.date = schedule.date;
		amountData.payee = '아낌이모기지론';
		amountData.category = '[급여계좌]';
		amountData.amount = schedule.amount;

		this.props.addTransactionAction(amountData);

		interestData.account = '아낌이모기지론';
		interestData.date = schedule.date;
		interestData.payee = '이자';
		interestData.category = '대출이자';
		interestData.amount = schedule.interest * (-1);

		this.props.addTransactionAction(interestData);
	}

	render () {
		const { classes, mortgageSchedule } = this.props;
		const today = moment().format('YYYY-MM');
		const filteredMorageSchedule = mortgageSchedule.filter(i => i.date >= today);

		return (
			<div className="investments">
				<Table className={classes.table}>
					<TableHead>
						<TableRow>
							<TableCell align="center">No.</TableCell>
							<TableCell align="center">Date</TableCell>
							<TableCell align="center">Amount</TableCell>
							<TableCell align="center">Principal</TableCell>
							<TableCell align="center">Interest</TableCell>
							<TableCell align="center">Add</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{filteredMorageSchedule && filteredMorageSchedule.map(row => (
							<TableRow key={row.no}>
								<TableCell component="th" scope="row" align="center">
									{row.no}
								</TableCell>
								<TableCell align="center">
									{row.date}
								</TableCell>
								<TableCell align="center">
									{row.amount ? parseInt(row.amount, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
								</TableCell>
								<TableCell align="center">
									{row.principal ? parseInt(row.principal, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
								</TableCell>
								<TableCell align="center">
									{row.interest ? parseInt(row.interest, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
								</TableCell>
								<TableCell align="center">
									<Button
										color="primary"
										onClick={this.onAddClick(row.no)}
									>
										Add
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}
}

MortgageSchedule.propTypes = {
	addTransactionAction: PropTypes.func.isRequired,
	classes: PropTypes.object.isRequired,
	getMortgageScheduleAction: PropTypes.func.isRequired,
	mortgageSchedule:  PropTypes.array.isRequired
};

export default withStyles(styles)(MortgageSchedule);
