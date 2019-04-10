import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

import CircularProgress from '@material-ui/core/CircularProgress';

import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import RefreshIcon from '@material-ui/icons/Refresh';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

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

const styles = theme => ({
	container: {
		maxWidth: 1200,
		[theme.breakpoints.up('lg')]: {
			margin: '1em auto'
		},
		[theme.breakpoints.down('sm')]: {
			margin: 0
		}
	},
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing.unit * 2
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center'
	},
	sticky: {
		width: '100%',
		position: 'sticky',
		[theme.breakpoints.up('lg')]: {
			top: 62
		},
		[theme.breakpoints.down('sm')]: {
			top: 56
		}
	},
	button: {
		backgroundColor: 'white'
	},
	rightIcon: {
		marginLeft: theme.spacing.unit
	},
	table: {
		
	},
	cell: {
		[theme.breakpoints.down('sm')]: {
			padding: 0,
			width: '33%'
		},
		fontSize: '0.9em'
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

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

	render () {
		const { accountList, classes, updateInvestmentPriceFetching } = this.props;
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
				<div className={classes.container}>
					<Paper className={classes.paper}>
						<div className={classes.sticky}>
							<Button
								className={classes.button}
								fullWidth
								variant="outlined"
								color="primary"
								onClick={this.onRefreshClick}
							>
								Refresh
								<RefreshIcon className={classes.rightIcon} />
							</Button>
						</div>
						{
							updateInvestmentPriceFetching &&
							<CircularProgress className={classes.progress} />
						}
						<Table className={classes.table}>
							<TableHead>
								<TableRow>
									<TableCell align="center" className={classes.cell}><Amount value={sum} /></TableCell>
									<TableCell align="center" className={classes.cell}><Amount value={quickassets} /></TableCell>
									<TableCell align="center" className={classes.cell}><Amount value={financeSum} /></TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{accountList && accountList.map(row => (
									<TableRow key={row.name}>
										<TableCell component="th" scope="row" align="center" className={classes.cell}>
											<span>
												{`${typeEmoji[row.type]} ${row.type}`}
											</span>
										</TableCell>
										<TableCell align="center" className={classes.cell}>
											<span>
												{
													(row.type === 'Bank' || row.type === 'CCard' || row.type === 'Oth L' || row.type === 'Oth A' || row.type === 'Cash') &&
													<Link to={`/bank/${row.name}`} className={classes.link}>{row.name}</Link>
												}
												{
													row.type === 'Invst' &&
													<Link to={`/investment/${row.name}`} className={classes.link}>{row.name}</Link>
												}
											</span>
										</TableCell>
										<TableCell align="center" className={classes.cell}><Amount value={row.balance} /></TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Paper>
				</div>
			</div>
		);
	}
}

Home.propTypes = {
	accountList:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
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
)(withStyles(styles)(Home));
