import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';

import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FilterListIcon from '@mui/icons-material/FilterList';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

import {
	setfilteredInvestments
} from '../../actions/investmentActions';

export function InvestmentFilter ({
	allInvestments,
	filteredInvestments
}) {
	const dispatch = useDispatch();
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	const handleClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

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
		<div>
			<Button
				id="investment-filter-button"
				aria-controls={open ? 'investment-filter-menu' : undefined}
				aria-haspopup="true"
				aria-expanded={open ? 'true' : undefined}
				onClick={handleClick}
				size="small"
				startIcon={<FilterListIcon />}
				sx={{ textTransform: 'none' }}
			>
				Filter ({filteredInvestments.length})
			</Button>
			<Menu
				id="investment-filter-menu"
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{ 'aria-labelledby': 'investment-filter-button' }}
			>
				<Box sx={{ pl: 2, pr: 2, maxHeight: 500, overflowY: 'auto' }}>
					{allInvestments && allInvestments.map(j => (
						<FormControlLabel
							key={j}
							control={
								<Checkbox
									size="small"
									checked={filteredInvestments.includes(j)}
									onChange={(e) => onFilteredInvestmentsChange(j, e.target.checked)}
								/>
							}
							label={j}
							sx={{ display: 'block' }}
						/>
					))}
				</Box>
				<Divider />
				<Box sx={{ pl: 2, pr: 2, pt: 1, pb: 1 }}>
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
						sx={{ display: 'block' }}
					/>
				</Box>
			</Menu>
		</div>
	);
}

InvestmentFilter.propTypes = {
	allInvestments: PropTypes.array.isRequired,
	filteredInvestments: PropTypes.array.isRequired
};

export default InvestmentFilter;
