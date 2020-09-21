import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import TitleHeader from '../components/TitleHeader';
import InvestmentPerformance from '../components/InvestmentPerformance';

import { getInvestmentPerformance } from '../utils/performance';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	}
});

class Performance extends Component {
	render () {
		const {
			allAccountsTransactions,
			allInvestments,
			classes, 
			isMobile
		} = this.props;
		const { match } = this.props;
		const investment = match && match.params && match.params.investment;
		const investmentItem = allInvestments.find(i => i.name === investment);
		const investmentPrice = investmentItem && investmentItem.price;
		const investmentTransactions = allAccountsTransactions.filter(i => i.investment && i.investment === match.params.investment);
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
	allAccountsTransactions: PropTypes.array.isRequired,
	allInvestments: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	isMobile: PropTypes.bool,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string.isRequired
		}).isRequired
	})
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions,
	allInvestments: state.allInvestments,
	isMobile: state.ui.isMobile
});

export default connect(
	mapStateToProps,
	null
)(withStyles(styles)(Performance));
