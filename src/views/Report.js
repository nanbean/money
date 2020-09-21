import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import AppBar from '@material-ui/core/AppBar';

import TitleHeader from '../components/TitleHeader';

import MonthlyExpense from './MonthlyExpense';
import Dividend from './Dividend';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	}
});

export function Report ({
	classes
}) {
	const [value, setValue] = useState(0);

	const handleChange = (event, val) => {
		setValue(val);
	};

	return (
		<React.Fragment>
			<TitleHeader title="Report" />
			<div className={classes.container}>
				<AppBar position="static" color="default">
					<Tabs value={value} onChange={handleChange}>
						<Tab label="Monthly Expense" />
						<Tab label="Dividend" />
					</Tabs>
				</AppBar>
				{value === 0 && <MonthlyExpense />}
				{value === 1 && <Dividend />}
			</div>
		</React.Fragment>
	);
}

Report.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Report);
