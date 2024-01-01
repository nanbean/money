import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';

import {
	setfilteredInvestments
} from '../../actions/investmentActions';

export function InvestmentFilter ({
	allInvestments,
	filteredInvestments
}) {
	const dispatch = useDispatch();

	const onFilteredInvestmentsChange = name => event => {
		const checked = event.target.checked;

		const findIndex = filteredInvestments.findIndex(i => i === name);

		if ( checked === true) {
			if (findIndex >= 0) {
				// do nothing
			} else {
				dispatch(setfilteredInvestments([
					...filteredInvestments,
					name
				]));
			}
		} else if (findIndex >= 0) {
			dispatch(setfilteredInvestments([
				...filteredInvestments.slice(0, findIndex),
				...filteredInvestments.slice(findIndex + 1)
			]));
		} else {
			// do nothing
		}
	};

	const onAllInvestementClick = event => {
		const checked = event.target.checked;

		if ( checked === true) {
			dispatch(setfilteredInvestments([
				...allInvestments
			]));
		} else {
			dispatch(setfilteredInvestments([
			]));
		}
	};

	return (
		<Paper sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingLeft: theme.spacing(2),
			paddingRight: theme.spacing(2),
			paddingBottom: theme.spacing(1)
		})}>
			{
				allInvestments && allInvestments.map(j => {
					return (
						<div key={j} style={{ display: 'inline-block' }}>
							<FormControlLabel
								control={
									<Checkbox
										sx={(theme) => ({
											padding: theme.spacing(0.5)
										})}
										size="small"
										checked={filteredInvestments.find(q => q === j) ? true : false}
										onChange={onFilteredInvestmentsChange(j)}
									/>
								}
								label={j}
							/>
						</div>
					);
				})
			}
			<FormControlLabel
				control={
					<Checkbox
						key="All"
						sx={(theme) => ({
							padding: theme.spacing(0.5)
						})}
						size="small"
						checked={filteredInvestments.length === allInvestments.length}
						onClick={onAllInvestementClick}
					/>
				}
				label="All"
			/>
		</Paper>
	);
}

InvestmentFilter.propTypes = {
	allInvestments: PropTypes.array.isRequired,
	filteredInvestments: PropTypes.array.isRequired
};

export default InvestmentFilter;
