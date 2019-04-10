import { combineReducers } from 'redux';
import ui from './ui';
import transactions from './transactions';
import investmentAccountTransactions from './investmentAccountTransactions';
import accountList from './accountList';
import account from './account';
import accountType from './accountType';
import categoryList from './categoryList';
import payeeList from './payeeList';
import investmentList from './investmentList';
import accountInvestments from './accountInvestments';
import mortgageSchedule from './mortgageSchedule';
import netWorth from './netWorth';
import investmentTransactions from './investmentTransactions';
import allInvestmentsTransactions from './allInvestmentsTransactions';
import investmentPrice from './investmentPrice';
import allInvestmentsPrice from './allInvestmentsPrice';
import allInvestmentsList from './allInvestmentsList';
import xlsTransactions from './xlsTransactions';
import filteredInvestments from './filteredInvestments';
import allInvestmentsFiltered from './allInvestmentsFiltered';
import updateInvestmentPriceFetching from './updateInvestmentPriceFetching';
import lifetimePlannerFlow from './lifetimePlannerFlow';
import allAccountTransactions from './allAccountTransactions';
import messagingToken from './messagingToken';
import notifications from './notifications';
import allDividends from './allDividends';
import lastTransactions from './lastTransactions';
import weeklyTransactions from './weeklyTransactions';
import dropCategoryList from './dropCategoryList';
import dropPayeeList from './dropPayeeList';
import editTransaction from './editTransaction';
import deleteTransaction from './deleteTransaction';

const money = combineReducers({
	ui,
	accountList,
	account,
	accountType,
	transactions,
	investmentAccountTransactions,
	categoryList,
	payeeList,
	investmentList,
	accountInvestments,
	mortgageSchedule,
	netWorth,
	investmentTransactions,
	investmentPrice,
	allInvestmentsTransactions,
	allInvestmentsPrice,
	allInvestmentsList,
	xlsTransactions,
	filteredInvestments,
	allInvestmentsFiltered,
	updateInvestmentPriceFetching,
	lifetimePlannerFlow,
	allAccountTransactions,
	messagingToken,
	notifications,
	allDividends,
	lastTransactions,
	weeklyTransactions,
	dropCategoryList,
	dropPayeeList,
	editTransaction,
	deleteTransaction
});

export default money;
