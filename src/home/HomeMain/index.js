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

import {
	getWeeklyTransactionsAction
} from '../../actions/couchdbActions';

import {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded
} from '../../actions/ui/homeActions';

export function HomeMain () {
	const accountsExpanded = useSelector((state) => state.ui.home.accountsExpanded);
	const latestTransactionsExpanded = useSelector((state) => state.ui.home.latestTransactionsExpanded);
	const summaryExpanded = useSelector((state) => state.ui.home.summaryExpanded);
	const weeklyGraphExpanded = useSelector((state) => state.ui.home.weeklyGraphExpanded);
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getWeeklyTransactionsAction());
	}, [dispatch]);

	const onAccountsExpansionPanelChangeHalder = (event, expanded) => dispatch(changeAccountsExpanded(expanded));

	const onLatestTransactionsExpansionPanelChangeHalder = (event, expanded) => dispatch(changeLatestTransactionsExpanded(expanded));

	const onSummaryExpansionPanelChangeHalder = (event, expanded) => dispatch(changeSummaryExpanded(expanded));
	
	const onWeeklyGraphExpansionPanelChangeHalder = (event, expanded) => dispatch(changeWeeklyGraphExpanded(expanded));

	return (
		<React.Fragment>
			<TitleHeader title="Home" />
			<Container>
				<Masonry columns={{ xs:1, sm:1, md:2, lg:3 }}>
					<Paper>
						<Accordion
							expanded={summaryExpanded}
							onChange={onSummaryExpansionPanelChangeHalder}
						>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
									Summary
								</Typography>
							</AccordionSummary>
							<AccordionDetails sx={{ padding: 0 }}>
								<Summary />
							</AccordionDetails>
						</Accordion>
					</Paper>
					<Paper>
						<Accordion
							expanded={weeklyGraphExpanded}
							onChange={onWeeklyGraphExpansionPanelChangeHalder}
						>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
									Weekly Graph
								</Typography>
							</AccordionSummary>
							<AccordionDetails sx={{ padding: 0 }}>
								<WeeklyGraph/>
							</AccordionDetails>
						</Accordion>
					</Paper>
					<Paper>
						<Accordion
							expanded={latestTransactionsExpanded}
							onChange={onLatestTransactionsExpansionPanelChangeHalder}
						>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
									Latest Transactions
								</Typography>
							</AccordionSummary>
							<AccordionDetails sx={{ padding: 0 }}>
								<LatestTransactions/>
							</AccordionDetails>
						</Accordion>
					</Paper>
					<Paper>
						<Accordion
							expanded={accountsExpanded}
							onChange={onAccountsExpansionPanelChangeHalder}
						>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
									Accounts
								</Typography>
							</AccordionSummary>
							<AccordionDetails sx={{ padding: 0 }}>
								<AccountList/>
							</AccordionDetails>
						</Accordion>
					</Paper>
					<Paper>
						<Accordion
							expanded={accountsExpanded}
							onChange={onAccountsExpansionPanelChangeHalder}
						>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle1">
									Stock List
								</Typography>
							</AccordionSummary>
							<AccordionDetails sx={{ padding: 0 }}>
								<StockList/>
							</AccordionDetails>
						</Accordion>
					</Paper>
				</Masonry>
			</Container>
		</React.Fragment>
	);
}

export default HomeMain;
