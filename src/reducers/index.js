import { combineReducers } from 'redux';
import ui from './ui';
import investmentAccountTransactions from './investmentAccountTransactions';
import accountList from './accountList';
import account from './account';
import dropInvestmentList from './dropInvestmentList';
import accountInvestments from './accountInvestments';
import mortgageSchedule from './mortgageSchedule';
import investmentTransactions from './investmentTransactions';
import investmentPrice from './investmentPrice';
import allInvestmentsPrice from './allInvestmentsPrice';
import allInvestmentsList from './allInvestmentsList';
import filteredInvestments from './filteredInvestments';
import updateInvestmentPriceFetching from './updateInvestmentPriceFetching';
import lifetimePlannerFlow from './lifetimePlannerFlow';
import netWorthFlow from './netWorthFlow';
import allAccountsTransactions from './allAccountsTransactions';
import messagingToken from './messagingToken';
import notifications from './notifications';
import dropCategoryList from './dropCategoryList';
import dropPayeeList from './dropPayeeList';
import addTransaction from './addTransaction';
import editTransaction from './editTransaction';
import deleteTransaction from './deleteTransaction';
import username from './username';
import historyList from './historyList';
import allInvestments from './allInvestments';
import weeklyTransactions from './weeklyTransactions';
import latestTransactions from './latestTransactions';
import trascationsFetching from './trascationsFetching';
import settings from './settings';

const money = combineReducers({
	ui,
	accountList,
	account,
	investmentAccountTransactions,
	dropInvestmentList,
	accountInvestments,
	mortgageSchedule,
	investmentTransactions,
	investmentPrice,
	allInvestmentsPrice,
	allInvestmentsList,
	filteredInvestments,
	updateInvestmentPriceFetching,
	lifetimePlannerFlow,
	netWorthFlow,
	allAccountsTransactions,
	messagingToken,
	notifications,
	dropCategoryList,
	dropPayeeList,
	addTransaction,
	editTransaction,
	deleteTransaction,
	username,
	historyList,
	allInvestments,
	weeklyTransactions,
	latestTransactions,
	trascationsFetching,
	settings
});

export default money;
