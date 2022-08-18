import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { styled } from '@mui/material/styles';

import LinearProgress from '@mui/material/LinearProgress';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import Typography from '@mui/material/Typography';

import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import Summary from '../Summary';
import LatestTransactions from '../LatestTransactions';
import AccountList from '../AccountList';
import WeeklyGraph from '../WeeklyGraph';

import TitleHeader from '../../components/TitleHeader';

import Container from '../../components/Container';

import {
	getWeeklyTransactionsAction
} from '../../actions/couchdbActions';
import { updateInvestmentPriceAction } from '../../actions/priceActions';

import {
	changeAccountsExpanded,
	changeLatestTransactionsExpanded,
	changeSummaryExpanded,
	changeWeeklyGraphExpanded
} from '../../actions/ui/homeActions';

const Sticky = styled('div')(({ theme }) => ({
	width: '100%',
	position: 'sticky',
	zIndex: theme.zIndex.drawer + 1,
	[theme.breakpoints.down('sm')]: {
		top: 56
	},
	[theme.breakpoints.up('sm')]: {
		top: 64
	},
	[theme.breakpoints.up('md')]: {
		marginBottom: 10
	},
	backgroundColor: 'white'
}));

export function HomeMain () {
	const accountsExpanded = useSelector((state) => state.ui.home.accountsExpanded);
	const latestTransactionsExpanded = useSelector((state) => state.ui.home.latestTransactionsExpanded);
	const summaryExpanded = useSelector((state) => state.ui.home.summaryExpanded);
	const trascationsFetching = useSelector((state) => state.trascationsFetching);
	const updateInvestmentPriceFetching = useSelector((state) => state.updateInvestmentPriceFetching);
	const weeklyGraphExpanded = useSelector((state) => state.ui.home.weeklyGraphExpanded);
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(getWeeklyTransactionsAction());
	}, []);

	const onAccountsExpansionPanelChangeHalder = (event, expanded) => dispatch(changeAccountsExpanded(expanded));

	const onLatestTransactionsExpansionPanelChangeHalder = (event, expanded) => dispatch(changeLatestTransactionsExpanded(expanded));

	const onSummaryExpansionPanelChangeHalder = (event, expanded) => dispatch(changeSummaryExpanded(expanded));
	
	const onWeeklyGraphExpansionPanelChangeHalder = (event, expanded) => dispatch(changeWeeklyGraphExpanded(expanded));

	const onRefreshClick = () => dispatch(updateInvestmentPriceAction());

	return (
		<React.Fragment>
			<TitleHeader title="Home" />
			{
				(updateInvestmentPriceFetching || trascationsFetching) &&
				<LinearProgress color="secondary"/>
			}
			<Container>
				<Sticky>
					<Button
						fullWidth
						variant="outlined"
						color="primary"
						onClick={onRefreshClick}
					>
						Refresh
						<RefreshIcon />
					</Button>
				</Sticky>
				<Grid container>
					<Grid item xs={12} sm={12} md={6} lg={6} xl={6} >
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
					</Grid>
					<Grid item xs={12} sm={12} md={6} lg={6} xl={6} >
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
					</Grid>
					<Grid item xs={12} sm={12} md={6} lg={6} xl={6} >
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
					</Grid>
					<Grid item xs={12} sm={12} md={6} lg={6} xl={6} >
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
					</Grid>
				</Grid>
			</Container>
		</React.Fragment>
	);
}

export default HomeMain;
