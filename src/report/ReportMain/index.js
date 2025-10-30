import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import ExpenseIcon from '@mui/icons-material/Analytics';
import DividendIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/BarChart';
import PortfolioIcon from '@mui/icons-material/PieChart';
import RetrunIcon from '@mui/icons-material/Percent';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import Layout from '../../components/Layout';
import MonthlyExpense from '../MonthlyExpense';
import Dividend from '../Dividend';
import InvestmentHistory from '../InvestmentHistory';
import InvestmentPortfolio from '../InvestmentPortfolio';
import RateOfReturn from '../RateOfReturn';

import useMobile from '../../hooks/useMobile';
import AmexTracker from '../AmexTracker';

const TABS = [
	{
		id: 'expense',
		label: 'Expense',
		icon: <ExpenseIcon />,
		component: <MonthlyExpense />
	},
	{
		id: 'dividend',
		label: 'Dividend',
		icon: <DividendIcon />,
		component: <Dividend />
	},
	{
		id: 'history',
		label: 'History',
		icon: <HistoryIcon />,
		component: <InvestmentHistory />
	},
	{
		id: 'portfolio',
		label: 'Portfolio',
		icon: <PortfolioIcon />,
		component: <InvestmentPortfolio />
	},
	{
		id: 'return',
		label: 'Return',
		icon: <RetrunIcon />,
		component: <RateOfReturn />
	},
	{
		id: 'amex',
		label: 'Amex',
		icon: <CreditCardIcon />,
		component: <AmexTracker />
	}
];

export function ReportMain () {
	const { tab } = useParams();
	const navigate = useNavigate();
	const [value, setValue] = useState(0);
	const isMobile = useMobile();

	useEffect(() => {
		const index = TABS.findIndex(t => t.id === tab);
		if (index >= 0) {
			setValue(index);
		} else {
			setValue(0);
		}
	}, [tab]);

	const handleChange = (event, val) => {
		navigate(`/report/${TABS[val].id}`);
	};

	return (
		<Layout title="Report">
			<Tabs value={value} onChange={handleChange}>
				{TABS.map(tabInfo => (
					<Tab key={tabInfo.id} label={isMobile ? tabInfo.icon : tabInfo.label} sx={{ minWidth: '50px' }} />
				))}
			</Tabs>
			{TABS[value] && TABS[value].component}
		</Layout>
	);
}

export default ReportMain;
