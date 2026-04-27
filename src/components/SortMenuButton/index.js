import React, { useState } from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';
import CheckIcon from '@mui/icons-material/Check';

import useT from '../../hooks/useT';

const SortMenuButton = ({ value, onChange, options }) => {
	const T = useT();
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
				startIcon={<SortIcon sx={{ fontSize: 16 }} />}
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
				{buttonLabel}
			</Button>
			<Menu
				id="sort-menu"
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{ 'aria-labelledby': 'sort-button', dense: true }}
				PaperProps={{
					style: {
						background: T.surf,
						border: `1px solid ${T.rule}`,
						borderRadius: 12,
						marginTop: 4,
						color: T.ink,
						boxShadow: T.dark
							? '0 8px 24px rgba(0,0,0,0.4)'
							: '0 8px 24px rgba(15,23,42,0.08)'
					}
				}}
			>
				{options.map((option) => {
					const selected = option.value === value;
					return (
						<MenuItem
							key={option.value}
							onClick={() => handleMenuItemClick(option.value)}
							sx={{
								fontSize: 13,
								fontWeight: selected ? 700 : 500,
								color: selected ? T.acc.deep : T.ink,
								background: selected ? T.acc.bright : 'transparent',
								gap: 1.5,
								paddingY: 0.75,
								'&:hover': { background: selected ? T.acc.bright : T.surf2 },
								'&.Mui-selected': { background: T.acc.bright },
								'&.Mui-selected:hover': { background: T.acc.bright }
							}}
						>
							<span style={{ flex: 1 }}>{option.label}</span>
							{selected && <CheckIcon sx={{ fontSize: 14, color: T.acc.deep }} />}
						</MenuItem>
					);
				})}
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