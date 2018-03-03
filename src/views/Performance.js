import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import TitleHeader from '../components/TitleHeader';
import InvestmentPerformance from '../components/InvestmentPerformance';

import { getInvestmentTransactionsAction } from '../actions/investmentActions';
import { getInvestmentPriceAction } from '../actions/priceActions'
import { getInvestmentPerformance } from '../utils/performance';

class Performance extends Component {
	componentWillMount () {
		const { match } = this.props;
		const investment = match && match.params && match.params.investment;

		this.props.getInvestmentTransactionsAction(investment);
		this.props.getInvestmentPriceAction(investment);
	}

	render () {
		const { isMobile, investmentTransactions, investmentPrice } = this.props;
		const { match } = this.props;
		const investment = match && match.params && match.params.investment;
		const performance = getInvestmentPerformance(investmentTransactions, investmentPrice);

		return (
			<div>
				<TitleHeader title={investment} />
				<div className='container-full-page'>
					<InvestmentPerformance
						isMobile={isMobile}
						investment={investment}
						performance={performance}
					/>
				</div>
			</div>
		);
	}
}

Performance.propTypes = {
	isMobile: PropTypes.bool,
	investmentPrice: PropTypes.number.isRequired,
	investmentTransactions: PropTypes.array.isRequired,
	getInvestmentTransactionsAction: PropTypes.func.isRequired,
	getInvestmentPriceAction: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	isMobile: state.ui.isMobile,
	investmentPrice: state.investmentPrice,
	investmentTransactions: state.investmentTransactions
});

const mapDispatchToProps = dispatch => ({
	getInvestmentTransactionsAction (params) {
		dispatch(getInvestmentTransactionsAction(params));
	},
	getInvestmentPriceAction (params) {
		dispatch(getInvestmentPriceAction(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Performance);
