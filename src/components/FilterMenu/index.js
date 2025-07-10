import React, { useState } from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FilterListIcon from '@mui/icons-material/FilterList';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

export function FilterMenu ({
	filterName = 'Filter',
	options = [],
	selectedOptions = [],
	onSelectionChange,
	showAllOption = false,
	allOptionLabel = 'All'
}) {
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	const handleClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleOptionChange = (value, isChecked) => {
		const isPresent = selectedOptions.includes(value);
		let newSelectedOptions;

		if (isChecked && !isPresent) {
			newSelectedOptions = [...selectedOptions, value];
		} else if (!isChecked && isPresent) {
			newSelectedOptions = selectedOptions.filter((i) => i !== value);
		} else {
			return; // No change
		}
		if (onSelectionChange) {
			onSelectionChange(newSelectedOptions);
		}
	};

	const handleAllOptionsClick = (event) => {
		const { checked } = event.target;
		let newSelectedOptions = [];
		if (checked) {
			newSelectedOptions = options.map(opt => opt.value);
		}
		if (onSelectionChange) {
			onSelectionChange(newSelectedOptions);
		}
	};

	const getButtonText = () => {
		if (options.length > 0 && selectedOptions.length === options.length) {
			return 'All';
		}
		if (selectedOptions.length === 0) {
			return 'None';
		}
		return selectedOptions.length;
	};

	return (
		<div>
			<Button
				aria-controls={open ? 'filter-menu' : undefined}
				aria-haspopup="true"
				aria-expanded={open ? 'true' : undefined}
				onClick={handleClick}
				size="small"
				startIcon={<FilterListIcon />}
				sx={{ textTransform: 'none' }}
			>
				{filterName} ({getButtonText()})
			</Button>
			<Menu
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{ 'aria-labelledby': 'filter-button' }}
			>
				<Box sx={{ pl: 2, pr: 2, maxHeight: 500, overflowY: 'auto' }}>
					{options.map((option) => (
						<FormControlLabel
							key={option.value}
							control={
								<Checkbox
									size="small"
									checked={selectedOptions.includes(option.value)}
									onChange={(e) => handleOptionChange(option.value, e.target.checked)}
								/>
							}
							label={option.label}
							sx={{ display: 'block' }}
						/>
					))}
				</Box>
				{showAllOption && <Divider />}
				{showAllOption && (
					<Box sx={{ pl: 2, pr: 2, pt: 1, pb: 1 }}>
						<FormControlLabel
							control={
								<Checkbox
									size="small"
									checked={options.length > 0 && selectedOptions.length === options.length}
									onChange={handleAllOptionsClick}
								/>
							}
							label={allOptionLabel}
							sx={{ display: 'block' }}
						/>
					</Box>
				)}
			</Menu>
		</div>
	);
}

FilterMenu.propTypes = {
	onSelectionChange: PropTypes.func.isRequired,
	options: PropTypes.arrayOf(PropTypes.shape({
		label: PropTypes.string.isRequired,
		value: PropTypes.any.isRequired
	})).isRequired,
	selectedOptions: PropTypes.array.isRequired,
	allOptionLabel: PropTypes.string,
	filterName: PropTypes.string,
	showAllOption: PropTypes.bool
};

export default FilterMenu;
