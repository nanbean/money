import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import FilterListIcon from '@mui/icons-material/FilterList';

import {
	setfilteredInvestments
} from '../../actions/investmentActions';

export function InvestmentFilter ({
	allInvestments,
	filteredInvestments
}) {
	const dispatch = useDispatch();
	const [isExpanded, setIsExpanded] = useState(false);

	const handleToggleExpand = () => setIsExpanded(!isExpanded);

	const onFilteredInvestmentsChange = (name, isChecked) => {
		const isPresent = filteredInvestments.includes(name);

		if (isChecked && !isPresent) {
			dispatch(setfilteredInvestments([...filteredInvestments, name]));
		} else if (!isChecked && isPresent) {
			dispatch(setfilteredInvestments(filteredInvestments.filter(i => i !== name)));
		}
	};

	const onAllInvestementClick = event => {
		const { checked } = event.target;
		if (checked) {
			dispatch(setfilteredInvestments([...allInvestments]));
		} else {
			dispatch(setfilteredInvestments([]));
		}
	};

	return (
		<Paper sx={{ p: 1 }}>
			<Stack spacing={1}>
				<Stack direction="row" spacing={1} alignItems="center">
					{!isExpanded && (
						<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexGrow: 1 }}>
							{filteredInvestments.map(item => (
								<Chip
									key={item}
									label={item}
									onDelete={() => onFilteredInvestmentsChange(item, false)}
									size="small"
								/>
							))}
						</Stack>
					)}
					<Button
						onClick={handleToggleExpand}
						startIcon={<FilterListIcon />}
						fullWidth={isExpanded}
						sx={isExpanded ? {} : { flexShrink: 0 }}
					>
						Filter ({filteredInvestments.length} / {allInvestments.length})
					</Button>
				</Stack>

				<Collapse in={isExpanded}>
					<Stack sx={{ pl: 1, maxHeight: 300, overflowY: 'auto' }}>
						{allInvestments && allInvestments.map(j => (
							<FormControlLabel
								key={j}
								control={
									<Checkbox
										sx={{ py: 0.5 }}
										size="small"
										checked={filteredInvestments.includes(j)}
										onChange={(e) => onFilteredInvestmentsChange(j, e.target.checked)}
									/>
								}
								label={j}
							/>
						))}
						<FormControlLabel
							control={
								<Checkbox
									key="All"
									sx={{ py: 0.5 }}
									size="small"
									checked={allInvestments.length > 0 && filteredInvestments.length === allInvestments.length}
									onChange={onAllInvestementClick}
								/>
							}
							label="All"
						/>
					</Stack>
				</Collapse>
			</Stack>
		</Paper>
	);
}

InvestmentFilter.propTypes = {
	allInvestments: PropTypes.array.isRequired,
	filteredInvestments: PropTypes.array.isRequired
};

export default InvestmentFilter;
