import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Masonry from '@mui/lab/Masonry';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import Summary from '../Summary';
import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';
import StockList from '../StockList';

import Container from '../../components/Container';
import TitleHeader from '../../components/TitleHeader';

import { getWeeklyTransactionsAction } from '../../actions/couchdbActions';
import {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded,
	changeStockListExpanded
} from '../../actions/ui/homeActions';

const panels = [
	{ key: 'summaryExpanded', component: Summary, title: 'Summary', action: changeSummaryExpanded },
	{ key: 'weeklyGraphExpanded', component: WeeklyGraph, title: 'Weekly Graph', action: changeWeeklyGraphExpanded },
	{ key: 'latestTransactionsExpanded', component: LatestTransactions, title: 'Latest Transactions', action: changeLatestTransactionsExpanded },
	{ key: 'accountsExpanded', component: AccountList, title: 'Accounts', action: changeAccountsExpanded },
	{ key: 'stockListExpanded', component: StockList, title: 'Stock List', action: changeStockListExpanded }
];

export function HomeMain () {
	const state = useSelector(state => state.ui.home);
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getWeeklyTransactionsAction());
	}, [dispatch]);

	const handlePanelChange = action => (event, expanded) => dispatch(action(expanded));

	return (
		<>
			<TitleHeader title="Home" />
			<Container>
				<Masonry columns={{ xs: 1, sm: 1, md: 2, lg: 3 }}>
					{panels.map(({ key, component: Component, title, action }) => (
						<Paper key={key}>
							<Accordion
								expanded={state[key]}
								onChange={handlePanelChange(action)}
							>
								<AccordionSummary expandIcon={<ExpandMoreIcon />}>
									<Typography variant="subtitle1">{title}</Typography>
								</AccordionSummary>
								<AccordionDetails sx={{ padding: 0 }}>
									<Component />
								</AccordionDetails>
							</Accordion>
						</Paper>
					))}
				</Masonry>
			</Container>
		</>
	);
}

export default HomeMain;