import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';

import ExpenseIcon from '@mui/icons-material/Analytics';
import DividendIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/BarChart';
import PortfolioIcon from '@mui/icons-material/PieChart';
import RetrunIcon from '@mui/icons-material/Percent';

import TitleHeader from '../../components/TitleHeader';
import Container from '../../components/Container';

import MonthlyExpense from '../MonthlyExpense';
import Dividend from '../Dividend';
import InvestmentHistory from '../InvestmentHistory';
import InvestmentPortfolio from '../InvestmentPortfolio';
import RateOfReturn from '../RateOfReturn';

import useMobile from '../../hooks/useMobile';

const TAB_ICON = {
	'Expense': <ExpenseIcon />,
	'Dividend': <DividendIcon />,
	'History': <HistoryIcon />,
	'Portfolio': <PortfolioIcon />,
	'Return': <RetrunIcon />
};

const TAB_LIST = [
	'expense',
	'dividend',
	'history',
	'portfolio',
	'return'
];

export function ReportMain () {
	const { tab } = useParams();
	const navigate = useNavigate();
	const [value, setValue] = useState(0);
	const isMobile = useMobile();

	useEffect(() => {
		const index = TAB_LIST.findIndex(i => i === tab);
		if (index >= 0) {
			setValue(index);
		} else {
			setValue(0);
		}
	}, [tab]);

	const handleChange = (event, val) => {
		navigate(`/report/${TAB_LIST[val]}`);
	};

	return (
		<React.Fragment>
			<TitleHeader title="Report" />
			<Container>
				<AppBar
					position="static"
					color="default"
					sx={(theme) => ({
						marginBottom: theme.spacing(1)
					})}
				>
					<Tabs value={value} onChange={handleChange}>
						<Tab label={isMobile ? TAB_ICON['Expense']:'Expense'} sx={ () => ({ minWidth: '75px' })} />
						<Tab label={isMobile ? TAB_ICON['Dividend']:'Dividend'} sx={() => ({ minWidth: '75px' })} />
						<Tab label={isMobile ? TAB_ICON['History']:'History'} sx={() => ({ minWidth: '75px' })} />
						<Tab label={isMobile ? TAB_ICON['Portfolio']:'Portfolio'} sx={() => ({ minWidth: '75px' })} />
						<Tab label={isMobile ? TAB_ICON['Return']:'Return'} sx={() => ({ minWidth: '75px' })} />
					</Tabs>
				</AppBar>
				{value === 0 && <MonthlyExpense />}
				{value === 1 && <Dividend />}
				{value === 2 && <InvestmentHistory />}
				{value === 3 && <InvestmentPortfolio />}
				{value === 4 && <RateOfReturn />}
			</Container>
		</React.Fragment>
	);
}

export default ReportMain;
