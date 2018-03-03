import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Divider } from 'semantic-ui-react';

import InvestmentPerformance from '../components/InvestmentPerformance';
import InvestmentFilter from '../components/InvestmentFilter';
import TitleHeader from '../components/TitleHeader';

import {
	 getAllInvestmentsTransactionsAction,
	 getAllInvestmentsPriceAction,
	 setfilteredInvestments
 } from '../actions/investmentActions';
import { toCurrencyFormat } from '../utils/formatting';
import { getInvestmentPerformance } from '../utils/performance';

class AllPerformance extends Component {
	componentWillMount () {
		this.props.getAllInvestmentsTransactionsAction();
		this.props.getAllInvestmentsPriceAction();
	}

	render () {
		const { isMobile, allInvestmentsTransactions, allInvestmentsPrice, filteredInvestments, allInvestmentsFiltered } = this.props;

		const allPerformance = allInvestmentsTransactions.length > 0 && allInvestmentsPrice.length > 0 && allInvestmentsTransactions.map(i => {
			const investmentTransactions = i.transactions
			const investmentPrice = allInvestmentsPrice.find(p => p.investment === i.investment).price;
			const investment = i.investment;
			const performance = getInvestmentPerformance(investmentTransactions, investmentPrice);
			const totalPerformance = performance.length > 0 && performance.map(l => l.periodReturn).reduce((a, b) => a + b);
			const totalQuantity = performance.length > 0 && performance.map(m => m.quantity).reduce((a, b) => a + b);

			return {
				investment: investment,
				performance: performance,
				totalPerformance: totalPerformance,
				totalQuantity: totalQuantity
			}
		});

		const filteredPerformance = allPerformance.length > 0 && allPerformance.filter(i => {
			return filteredInvestments.find(j => j === i.investment);
		});
		const grandTotalPerformance = filteredPerformance.length > 0 ? filteredPerformance.map(l => l.totalPerformance).reduce((a, b) => a + b) : 0;

		return (
			<div>
				<TitleHeader title='Performance' />
				<div className='container-full-page'>
					<div className='container-header'>
						<InvestmentFilter
							allInvestmentsPrice={allInvestmentsPrice}
							filteredInvestments={filteredInvestments}
							allInvestmentsFiltered={allInvestmentsFiltered}
							setfilteredInvestments={this.props.setfilteredInvestments}
						/>
					</div>
					<Divider horizontal>Grand Total : {toCurrencyFormat(grandTotalPerformance)}</Divider>
					{
						filteredPerformance && filteredPerformance.map(i => {
							return (
								<InvestmentPerformance
									key={i.investment}
									isMobile={isMobile}
									investment={i.investment}
									performance={i.performance}
								/>
							);
						})
					}
				</div>
			</div>
		);
	}
}

AllPerformance.propTypes = {
	isMobile: PropTypes.bool,
	allInvestmentsPrice: PropTypes.array.isRequired,
	allInvestmentsTransactions: PropTypes.array.isRequired,
	getAllInvestmentsTransactionsAction: PropTypes.func.isRequired,
	getAllInvestmentsPriceAction: PropTypes.func.isRequired,
	setfilteredInvestments: PropTypes.func.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	allInvestmentsFiltered: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
	isMobile: state.ui.isMobile,
	allInvestmentsPrice: state.allInvestmentsPrice,
	allInvestmentsTransactions: state.allInvestmentsTransactions,
	filteredInvestments: state.filteredInvestments,
	allInvestmentsFiltered: state.allInvestmentsFiltered
});

const mapDispatchToProps = dispatch => ({
	getAllInvestmentsTransactionsAction () {
		dispatch(getAllInvestmentsTransactionsAction());
	},
	getAllInvestmentsPriceAction () {
		dispatch(getAllInvestmentsPriceAction());
	},
	setfilteredInvestments (params) {
		dispatch(setfilteredInvestments(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AllPerformance);
