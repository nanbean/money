import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Table, Button, Loader } from 'semantic-ui-react';

import TitleHeader from '../components/TitleHeader';
import Amount from '../components/Amount';

import { updateInvestmentPriceAction } from '../actions/priceActions';
import { getAccountListAction } from '../actions/accountActions';

const typeEmoji = {
	'Bank': '🏦',
	'CCard': '💳',
	'Cash': '💵',
	'Invst': '📈',
	'Oth L': '🏧',
	'Oth A': '🏠'
};

const quickAssetAccount = [
	'키움증권맥쿼리',
	'키움증권',
	'몬쁭스SK증권',
	'동양종금장마',
	'급여계좌',
	'KB체크카드',
	'KB카드',
	'LG카드',
	'생활비카드',
	'지갑',
	'연금저축',
	'IRP',
	'IRP오은미'
];

export class Home extends Component {
	constructor (props) {
		super(props);

		this.onRefreshClick = this.onRefreshClick.bind(this);
	}

	componentDidMount () {
		this.props.getAccountListAction();
	}

	onRefreshClick () {
		this.props.updateInvestmentPriceAction();
	}

	renderLists (data) {
		this.key = data.name;
		this.type = data.type;
		this.name = data.name;
		this.balance = data.balance;

		return (
			<Table.Row key={this.key}>
				<Table.Cell textAlign="center">
					<span>
						{`${typeEmoji[this.type]} ${this.type}`}
					</span>
				</Table.Cell>
				<Table.Cell textAlign="center">
					<span>
						{
							(this.type === 'Bank' || this.type === 'CCard' || this.type === 'Oth L' || this.type === 'Oth A' || this.type === 'Cash') &&
							<Link to={`/bank/${this.name}`}>{this.name}</Link>
						}
						{
							this.type === 'Invst' &&
							<Link to={`/investment/${this.name}`}>{this.name}</Link>
						}
					</span>
				</Table.Cell>
				<Table.Cell textAlign="center">
					<Amount value={this.balance} />
				</Table.Cell>
			</Table.Row>
		);
	}

	render () {
		const { accountList, updateInvestmentPriceFetching } = this.props;
		let sum = 0;
		let financeSum = 0;
		let quickassets = 0;

		if (accountList.length > 0) {
			sum = accountList.map((i) => i.balance).reduce( (prev, curr) => prev + curr );
			financeSum = accountList.filter(i => i.type !== 'Oth A')
				.map((i) => i.balance)
				.reduce( (prev, curr) => prev + curr );
			quickassets = accountList.filter(i => quickAssetAccount.find(j => j === i.name))
				.map((i) => i.balance)
				.reduce( (prev, curr) => prev + curr );
		}

		return (
			<div>
				<TitleHeader title="Home" />
				<div className="container-full-page">
					<div className="container-header header-sticky">
						<Button.Group basic fluid>
							<Button
								content="Refresh"
								icon="refresh"
								floated="right"
								labelPosition="right"
								onClick={this.onRefreshClick}
							/>
						</Button.Group>
					</div>
					<Loader active={updateInvestmentPriceFetching} size="huge"/>
					<Table basic="very" unstackable size="small">
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell textAlign="center">
									<Amount value={sum} />
								</Table.HeaderCell>
								<Table.HeaderCell textAlign="center">
									<Amount value={quickassets} />
								</Table.HeaderCell>
								<Table.HeaderCell textAlign="center">
									<Amount value={financeSum} />
								</Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{
								accountList && accountList.map(this.renderLists, this)
							}
						</Table.Body>
					</Table>
				</div>
			</div>
		);
	}
}

Home.propTypes = {
	accountList:  PropTypes.array.isRequired,
	getAccountListAction: PropTypes.func.isRequired,
	updateInvestmentPriceAction: PropTypes.func.isRequired,
	updateInvestmentPriceFetching: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList,
	updateInvestmentPriceFetching: state.updateInvestmentPriceFetching
});

const mapDispatchToProps = dispatch => ({
	getAccountListAction () {
		dispatch(getAccountListAction());
	},
	updateInvestmentPriceAction () {
		dispatch(updateInvestmentPriceAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Home);
