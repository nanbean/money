import React, { useState } from 'react';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';

import TitleHeader from '../../components/TitleHeader';
import Container from '../../components/Container';

import MonthlyExpense from '../MonthlyExpense';
import Dividend from '../Dividend';
import InvestmentHistory from '../InvestmentHistory';

export function ReportMain () {
	const [value, setValue] = useState(0);

	const handleChange = (event, val) => {
		setValue(val);
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
						<Tab label="Monthly Expense" />
						<Tab label="Dividend" />
						<Tab label="Investment History" />
					</Tabs>
				</AppBar>
				{value === 0 && <MonthlyExpense />}
				{value === 1 && <Dividend />}
				{value === 2 && <InvestmentHistory />}
			</Container>
		</React.Fragment>
	);
}

export default ReportMain;
