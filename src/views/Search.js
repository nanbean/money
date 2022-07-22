import React, { useEffect, useState } from 'react';
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

export function Search ({
	allAccountsTransactions,
	classes,
	isModalOpen,
	openTransactionInModal,
	resetTransactionForm,
	match
}) 
{
	const [filteredTransactions, setFilteredTransactions] = useState([]);
	const [keyword, setKeyword] = useState(match && match.params && match.params.keyword);

	useEffect(() => {
		updateFilteredTransactions(allAccountsTransactions, keyword);
	}, [keyword, allAccountsTransactions]);

	const updateFilteredTransactions = (allAccountsTransactions, keyword) => {
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
	
			setFilteredTransactions(filteredTransactions);
			setKeyword(keyword);
		}
	}

	const onSearchKeyPress = (e) => {
		if (e.key === 'Enter' && e.target.value) {
			updateFilteredTransactions(allAccountsTransactions, e.target.value);
		}
	}

	const onKeywordChange = (e) => {
		setKeyword(e.target.value);
	}

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
								onChange={onKeywordChange}
								onKeyPress={onSearchKeyPress}
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
							openTransactionInModal={openTransactionInModal}
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
