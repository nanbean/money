import React from 'react';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import TitleHeader from '../components/TitleHeader';

import MonthlyExpense from './MonthlyExpense';
import Dividend from './Dividend';

class Report extends React.Component {
	state = {
		value: 0
	};

	handleChange = (event, value) => {
		this.setState({ value });
	}

	render () {
		const { value } = this.state;
		
		return (
			<div>
				<TitleHeader title="Report" />
				<div className="container-full-page">
					<Tabs value={value} onChange={this.handleChange}>
						<Tab label="Monthly Expense" />
						<Tab label="Dividend" />
					</Tabs>
					{value === 0 && <MonthlyExpense />}
					{value === 1 && <Dividend />}
				</div>
			</div>
		);

	}
}

export default Report;
