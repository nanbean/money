import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Button, Icon } from 'semantic-ui-react';
import moment from 'moment';

class MortgageSchedule extends Component {
	constructor (props) {
		super(props);

		this.onAddClick = this.onAddClick.bind(this);
		this.renderMortgageSchedule = this.renderMortgageSchedule.bind(this);
	}

	onAddClick (e, data) {
		const { mortgageSchedule } = this.props;
		const schedule = mortgageSchedule[data.no - 1];
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
	};

	componentWillMount () {
		this.props.getMortgageScheduleAction();
	}

	renderMortgageSchedule (schedule, index) {
		return (
			<Table.Row key={schedule.no}>
				<Table.Cell>
					{schedule.no}
				</Table.Cell>
				<Table.Cell>
					{schedule.date}
				</Table.Cell>
				<Table.Cell>
					{schedule.amount ? parseInt(schedule.amount, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ''}
				</Table.Cell>
				<Table.Cell>
					{schedule.principal ? parseInt(schedule.principal, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ''}
				</Table.Cell>
				<Table.Cell>
					{schedule.interest ? parseInt(schedule.interest, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ''}
				</Table.Cell>
				<Table.Cell textAlign='center'>
					<Button
						icon
						floated='right'
						size='mini'
						no={schedule.no}
						onClick={this.onAddClick}
					>
						<Icon name='add' />
					</Button>
				</Table.Cell>
			</Table.Row>
		);
	}

	render () {
		const { mortgageSchedule } = this.props;
		const today = moment().format('YYYY-MM');
		const filteredMorageSchedule = mortgageSchedule.filter(i => i.date >= today);

		return (
			<div className='investments'>
				<Table celled size='small'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell>
								No.
							</Table.HeaderCell>
							<Table.HeaderCell>
								Date
							</Table.HeaderCell>
							<Table.HeaderCell>
								Amount
							</Table.HeaderCell>
							<Table.HeaderCell>
								Principal
							</Table.HeaderCell>
							<Table.HeaderCell>
								Interest
							</Table.HeaderCell>
							<Table.HeaderCell>
								Add
							</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{
							filteredMorageSchedule && filteredMorageSchedule.map(this.renderMortgageSchedule, this)
						}
					</Table.Body>
				</Table>
			</div>
		);
	}
}

MortgageSchedule.propTypes = {
	mortgageSchedule:  PropTypes.array.isRequired,
	getMortgageScheduleAction: PropTypes.func.isRequired,
	addTransactionAction: PropTypes.func.isRequired
};

export default MortgageSchedule;
