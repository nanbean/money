import React, { useState } from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';

const SortMenuButton = ({ value, onChange, options }) => {
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	const handleClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleMenuItemClick = (newValue) => {
		onChange(newValue);
		handleClose();
	};

	const currentOption = options.find(opt => opt.value === value);
	const buttonLabel = currentOption ? currentOption.label : 'Sort';

	return (
		<div>
			<Button
				id="sort-button"
				aria-controls={open ? 'sort-menu' : undefined}
				aria-haspopup="true"
				aria-expanded={open ? 'true' : undefined}
				onClick={handleClick}
				size="small"
				endIcon={<SortIcon />}
				sx={{ textTransform: 'none' }}
			>
				{buttonLabel}
			</Button>
			<Menu
				id="sort-menu"
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{ 'aria-labelledby': 'sort-button' }}
			>
				{options.map((option) => (
					<MenuItem
						key={option.value}
						onClick={() => handleMenuItemClick(option.value)}
						selected={option.value === value}
					>
						{option.label}
					</MenuItem>
				))}
			</Menu>
		</div>
	);
};

SortMenuButton.propTypes = {
	onChange: PropTypes.func.isRequired,
	options: PropTypes.arrayOf(PropTypes.shape({
		value: PropTypes.string.isRequired,
		label: PropTypes.string.isRequired
	})).isRequired,
	value: PropTypes.string.isRequired
};

export default SortMenuButton;