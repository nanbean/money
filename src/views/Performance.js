import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import TitleHeader from '../components/TitleHeader';
import InvestmentPerformance from '../components/InvestmentPerformance';

import { getInvestmentTransactionsAction } from '../actions/investmentActions';
import { getInvestmentPriceAction } from '../actions/priceActions';
import { getInvestmentPerformance } from '../utils/performance';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	}
});

class Performance extends Component {
	componentDidMount () {
		const { match } = this.props;
		const investment = match && match.params && match.params.investment;

		this.props.getInvestmentTransactionsAction(investment);
		this.props.getInvestmentPriceAction(investment);
	}

	render () {
		const { classes, isMobile, investmentTransactions, investmentPrice } = this.props;
		const { match } = this.props;
		const investment = match && match.params && match.params.investment;
		const performance = getInvestmentPerformance(investmentTransactions, investmentPrice);

		return (
			<div>
				<TitleHeader title={investment} />
				<div className={classes.container}>
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
	classes: PropTypes.object.isRequired,
	getInvestmentPriceAction: PropTypes.func.isRequired,
	getInvestmentTransactionsAction: PropTypes.func.isRequired,
	investmentPrice: PropTypes.number.isRequired,
	investmentTransactions: PropTypes.array.isRequired,
	isMobile: PropTypes.bool,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string.isRequired
		}).isRequired
	})
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
)(withStyles(styles)(Performance));
