import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import moment from 'moment';

class MortgageSchedule extends Component {
	constructor (props) {
		super(props);

		this.renderMortgageSchedule = this.renderMortgageSchedule.bind(this);
	}

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

	renderMortgageSchedule (schedule) {
		return (
			<Table.Row key={schedule.no}>
				<Table.Cell>
					{schedule.no}
				</Table.Cell>
				<Table.Cell>
					{schedule.date}
				</Table.Cell>
				<Table.Cell>
					{schedule.amount ? parseInt(schedule.amount, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
				</Table.Cell>
				<Table.Cell>
					{schedule.principal ? parseInt(schedule.principal, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
				</Table.Cell>
				<Table.Cell>
					{schedule.interest ? parseInt(schedule.interest, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
				</Table.Cell>
				<Table.Cell textAlign="center">
					{/* <Button
						icon
						floated="right"
						size="mini"
						no={schedule.no}
						onClick={this.onAddClick}
					>
						<Icon name="add" />
					</Button> */}
					<Button
						color="primary"
						onClick={this.onAddClick(schedule.no)}
					>
						Add
					</Button>
				</Table.Cell>
			</Table.Row>
		);
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
							<TableCell align="center" className={classes.cell}>No.</TableCell>
							<TableCell align="center" className={classes.cell}>Date</TableCell>
							<TableCell align="center" className={classes.cell}>Amount</TableCell>
							<TableCell align="center" className={classes.cell}>Principal</TableCell>
							<TableCell align="center" className={classes.cell}>Interest</TableCell>
							<TableCell align="center" className={classes.cell}>Add</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{filteredMorageSchedule && filteredMorageSchedule.map(row => (
							<TableRow key={row.name}>
								<TableCell component="th" scope="row" align="center" className={classes.cell}>
									{row.no}
								</TableCell>
								<TableCell align="center" className={classes.cell}>
									{row.date}
								</TableCell>
								<TableCell align="center" className={classes.cell}>
									{row.amount ? parseInt(row.amount, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
								</TableCell>
								<TableCell align="center" className={classes.cell}>
									{row.principal ? parseInt(row.principal, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
								</TableCell>
								<TableCell align="center" className={classes.cell}>
									{row.interest ? parseInt(row.interest, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
								</TableCell>
								<TableCell align="center" className={classes.cell}>
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

export default MortgageSchedule;
