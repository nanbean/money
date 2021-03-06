import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import SearchIcon from '@material-ui/icons/Search';

import TitleHeader from '../components/TitleHeader';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';

import {
	openTransactionInModal,
	resetTransactionForm
} from '../actions/ui/form/bankTransaction';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	},
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing(2)
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		alignItems: 'center'
	},
	sticky: {
		width: '100%',
		position: 'sticky',
		paddingLeft: theme.spacing(1),
		paddingRight: theme.spacing(1),
		[theme.breakpoints.up('lg')]: {
			top: 62
		},
		[theme.breakpoints.down('sm')]: {
			top: 56
		}
	}
});

class Search extends Component {
	constructor (props) {
		super(props);

		this.onSearchKeyPress = this.onSearchKeyPress.bind(this);
		this.onKeywordChange = this.onKeywordChange.bind(this);
		this.updateFilteredTransactions = this.updateFilteredTransactions.bind(this);

		this.state = {
			filteredTransactions: [],
			keyword: ''
		};
	}

	componentDidMount () {
		const { match } = this.props;
		const keyword = match && match.params && match.params.keyword;

		this.setState({
			keyword
		});
	}

	updateFilteredTransactions (allAccountsTransactions, keyword) {
		if (keyword) {
			let filteredTransactions = [];

			allAccountsTransactions.forEach(i => {
				if (i.type === 'CCard' || i.type === 'Bank' || i.type === 'Cash') {
					filteredTransactions.push(i);
				}
			});

			filteredTransactions = filteredTransactions.filter(i => i.category.match(new RegExp(keyword, 'i')) || i.payee.match(new RegExp(keyword, 'i')) ||
						(i.subcategory && i.subcategory.match(new RegExp(keyword, 'i'))) || (i.memo && i.memo.match(new RegExp(keyword, 'i')))
			);
	

			// for (let i in allAccountTransactions) {
			// 	const account = allAccountTransactions[i];
			// 	if (account.type === 'CCard' || account.type === 'Bank' || account.type === 'Cash') {
			// 		const divisionTransaction = account.transactions.filter(k => k.division);
			// 		let divisions = [];
			// 		for (let l = 0; l < divisionTransaction.length; l++) {
			// 			const division = divisionTransaction[l].division;
			// 			const date = divisionTransaction[l].date;
			// 			for (let m = 0; m < division.length; m++) {
			// 				const divisionItem = division[m];
			// 				divisionItem.date = date;
			// 				divisionItem.payee = divisionItem.description;
			// 				divisions.push(divisionItem);
			// 			}
			// 		}
			// 		filteredTransactions = [
			// 			...filteredTransactions,
			// 			...account.transactions.filter(j => {
			// 				if (j.category.match(new RegExp(keyword, 'i')) || j.payee.match(new RegExp(keyword, 'i'))) {
			// 					return true;
			// 				} else if (j.subcategory && j.subcategory.match(new RegExp(keyword, 'i'))) {
			// 					return true;
			// 				} else if (j.memo && j.memo.match(new RegExp(keyword, 'i'))) {
			// 					return true;
			// 				} else {
			// 					return false;
			// 				}
			// 			}).map(k => {
			// 				k.account = i;
			// 				return k;
			// 			})
			// 		];
			// 	}
			// }
			this.setState({
				filteredTransactions,
				keyword
			});
		}
	}

	onSearchKeyPress (e) {
		if (e.key === 'Enter' && e.target.value) {
			const { allAccountsTransactions } = this.props;
			const keyword = e.target.value;
			this.updateFilteredTransactions(allAccountsTransactions,  keyword);
		}
	}

	onKeywordChange (e) {
		this.setState({
			keyword: e.target.value
		});
	}

	render () {
		const { classes } = this.props;
		const { filteredTransactions, keyword } = this.state;

		return (
			<div>
				<TitleHeader title="Search" />
				<div className={classes.container}>
					<Paper className={classes.paper}>
						<div className={classes.sticky}>
							<FormControl margin="normal" required fullWidth>
								<Input
									id="search"
									name="search"
									autoComplete="search"
									autoFocus
									value={keyword}
									onChange={this.onKeywordChange}
									onKeyPress={this.onSearchKeyPress}
									startAdornment={
										<InputAdornment position="start">
											<SearchIcon />
										</InputAdornment>
									}
								/>
							</FormControl>
						</div>
						{
							filteredTransactions.length > 0 &&
							<BankTransactions
								showAccount
								transactions={filteredTransactions}
								openTransactionInModal={this.props.openTransactionInModal}
							/>
						}
						<BankTransactionModal
							isEdit={true}
							transactions={filteredTransactions} // TODO: need to pass allTransactions for input autocomplete
						/>
					</Paper>
				</div>
			</div>
		);
	}
}

Search.propTypes = {
	allAccountsTransactions:  PropTypes.array.isRequired,
	classes: PropTypes.object.isRequired,
	isModalOpen: PropTypes.bool.isRequired,
	openTransactionInModal: PropTypes.func.isRequired,
	resetTransactionForm: PropTypes.func.isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			name: PropTypes.string
		}).isRequired
	})
};

const mapStateToProps = state => ({
	allAccountsTransactions: state.allAccountsTransactions,
	isModalOpen: state.ui.form.bankTransaction.isModalOpen
});

const mapDispatchToProps = dispatch => ({
	openTransactionInModal (params) {
		dispatch(openTransactionInModal(params));
	},
	resetTransactionForm () {
		dispatch(resetTransactionForm());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Search));
