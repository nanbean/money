import React from 'react';
import { Tab } from 'semantic-ui-react';

import TitleHeader from '../components/TitleHeader';

import MonthlyExpense from './MonthlyExpense';
import Dividend from './Dividend';

/* eslint-disable react/display-name */
const panes = [
	{ menuItem: 'Monthly Expense', render: () => <Tab.Pane><MonthlyExpense /></Tab.Pane> },
	{ menuItem: 'Dividend', render: () => <Tab.Pane><Dividend /></Tab.Pane> }
];
/* eslint-enable  react/display-name */

const Report = () =>
	<div>
		<TitleHeader title="Report" />
		<div className="container-full-page">
			<Tab panes={panes} />
		</div>
	</div>;

export default Report;
