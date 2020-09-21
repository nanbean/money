import React, { useMemo } from 'react';
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

const getInvestmentItem = (investments, name) => investments.find(i => i.name === name);
const getInvestmentTransactions = (transactions, investment) => transactions.filter(i => i.investment && i.investment === investment);

export function Performance ({
	allAccountsTransactions,
	allInvestments,
	classes,
	match
}) {
	const investment = match && match.params && match.params.investment;
	const investmentItem = useMemo(() => getInvestmentItem(allInvestments, investment), [allInvestments, investment]);
	const investmentPrice = investmentItem && investmentItem.price;
	const investmentTransactions = useMemo(() => getInvestmentTransactions(allAccountsTransactions, investment), [allAccountsTransactions, investment]);
	const performance = useMemo(() => getInvestmentPerformance(investmentTransactions, investmentPrice), [investmentTransactions, investmentPrice]);

	return (
		<React.Fragment>
			<TitleHeader title={investment} />
			<div className={classes.container}>
				<InvestmentPerformance
					investment={investment}
					performance={performance}
				/>
			</div>
		</React.Fragment>
	);
}

Performance.propTypes = {
	allAccountsTransactions: PropTypes.array.isRequired,
	allInvestments: PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string.isRequired
		}).isRequired
	})
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions,
	allInvestments: state.allInvestments
});

export default connect(
	mapStateToProps
)(withStyles(styles)(Performance));
