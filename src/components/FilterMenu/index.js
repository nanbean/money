import React, { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

import useT from '../../hooks/useT';

export function FilterMenu ({
	filterName = 'Filter',
	options = [],
	selectedOptions = [],
	onSelectionChange,
	showAllOption = false,
	allOptionLabel = 'All'
}) {
	const T = useT();
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	const handleClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleOptionChange = (value) => {
		const isPresent = selectedOptions.includes(value);
		const newSelectedOptions = isPresent
			? selectedOptions.filter(i => i !== value)
			: [...selectedOptions, value];
		if (onSelectionChange) {
			onSelectionChange(newSelectedOptions);
		}
	};

	const handleAllOptionsClick = () => {
		const allSelected = options.length > 0 && selectedOptions.length === options.length;
		const newSelectedOptions = allSelected ? [] : options.map(opt => opt.value);
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

	const allSelected = options.length > 0 && selectedOptions.length === options.length;

	return (
		<div>
			<Button
				aria-controls={open ? 'filter-menu' : undefined}
				aria-haspopup="true"
				aria-expanded={open ? 'true' : undefined}
				onClick={handleClick}
				size="small"
				startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
				sx={{
					textTransform: 'none',
					padding: '4px 8px',
					fontSize: 12,
					fontWeight: 600,
					color: T.acc.bright,
					minWidth: 0,
					'&:hover': { background: T.acc.tint }
				}}
			>
				{filterName} ({getButtonText()})
			</Button>
			<Menu
				id="filter-menu"
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{ 'aria-labelledby': 'filter-button', dense: true }}
				PaperProps={{
					style: {
						background: T.surf,
						border: `1px solid ${T.rule}`,
						borderRadius: 12,
						marginTop: 4,
						color: T.ink,
						minWidth: 220,
						maxHeight: 500,
						boxShadow: T.dark
							? '0 8px 24px rgba(0,0,0,0.4)'
							: '0 8px 24px rgba(15,23,42,0.08)'
					}
				}}
			>
				{options.map((option) => {
					const checked = selectedOptions.includes(option.value);
					const Icon = checked ? CheckBoxIcon : CheckBoxOutlineBlankIcon;
					return (
						<MenuItem
							key={option.value}
							onClick={() => handleOptionChange(option.value)}
							sx={{
								fontSize: 13,
								fontWeight: checked ? 600 : 500,
								color: checked ? T.ink : T.ink2,
								background: 'transparent',
								gap: 1,
								paddingY: 0.75,
								'&:hover': { background: T.surf2 }
							}}
						>
							<Icon sx={{ fontSize: 16, color: checked ? T.acc.bright : T.ink3 }} />
							<Box component="span" sx={{ flex: 1 }}>{option.label}</Box>
						</MenuItem>
					);
				})}
				{showAllOption && options.length > 0 && (
					<Divider sx={{ borderColor: T.rule, marginY: 0.5 }} />
				)}
				{showAllOption && (
					<MenuItem
						onClick={handleAllOptionsClick}
						sx={{
							fontSize: 13,
							fontWeight: 600,
							color: T.ink,
							background: 'transparent',
							gap: 1,
							paddingY: 0.75,
							'&:hover': { background: T.surf2 }
						}}
					>
						{allSelected
							? <CheckBoxIcon sx={{ fontSize: 16, color: T.acc.bright }} />
							: <CheckBoxOutlineBlankIcon sx={{ fontSize: 16, color: T.ink3 }} />}
						<Box component="span" sx={{ flex: 1 }}>{allOptionLabel}</Box>
					</MenuItem>
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
