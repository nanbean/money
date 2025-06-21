import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SortIcon from '@mui/icons-material/Sort';

import {
	updateGeneralAction
} from '../../actions/couchdbSettingActions';

export function ChartControls () {
	const dispatch = useDispatch();
	const { investmentHistoryRange = 'monthly', investmentHistoryType = 'quantity' } = useSelector((state) => state.settings.general);
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);
	const [anchorElType, setAnchorElType] = useState(null);
	const openType = Boolean(anchorElType);

	const handleMenuClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	const handleMenuItemClick = (newRange) => {
		dispatch(updateGeneralAction('investmentHistoryRange', newRange));
		handleMenuClose();
	};

	const handleTypeMenuClick = (event) => {
		setAnchorElType(event.currentTarget);
	};

	const handleTypeMenuClose = () => {
		setAnchorElType(null);
	};

	const handleTypeMenuItemClick = (newType) => {
		dispatch(updateGeneralAction('investmentHistoryType', newType));
		handleTypeMenuClose();
	};

	return (
		<Stack spacing={2} direction="row" justifyContent="flex-end" sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingBottom: theme.spacing(1)
		})}>
			<div>
				<Button
					id="type-button"
					aria-controls={openType ? 'type-menu' : undefined}
					aria-haspopup="true"
					aria-expanded={openType ? 'true' : undefined}
					onClick={handleTypeMenuClick}
					size="small"
					startIcon={<SortIcon />}
					sx={{ textTransform: 'none' }}
				>
					{investmentHistoryType.charAt(0).toUpperCase() + investmentHistoryType.slice(1)}
				</Button>
				<Menu
					id="type-menu"
					anchorEl={anchorElType}
					open={openType}
					onClose={handleTypeMenuClose}
					MenuListProps={{ 'aria-labelledby': 'type-button' }}>
					<MenuItem onClick={() => handleTypeMenuItemClick('quantity')} selected={'quantity' === investmentHistoryType}>Quantity</MenuItem>
					<MenuItem onClick={() => handleTypeMenuItemClick('amount')} selected={'amount' === investmentHistoryType}>Amount</MenuItem>
				</Menu>
			</div>
			<div>
				<Button
					id="range-button"
					aria-controls={open ? 'range-menu' : undefined}
					aria-haspopup="true"
					aria-expanded={open ? 'true' : undefined}
					onClick={handleMenuClick}
					size="small"
					startIcon={<SortIcon />}
					sx={{ textTransform: 'none' }}
				>
					{investmentHistoryRange.charAt(0).toUpperCase() + investmentHistoryRange.slice(1)}
				</Button>
				<Menu
					id="range-menu"
					anchorEl={anchorEl}
					open={open}
					onClose={handleMenuClose}
					MenuListProps={{ 'aria-labelledby': 'range-button' }}>
					<MenuItem onClick={() => handleMenuItemClick('monthly')} selected={'monthly' === investmentHistoryRange}>Monthly</MenuItem>
					<MenuItem onClick={() => handleMenuItemClick('yearly')} selected={'yearly' === investmentHistoryRange}>Yearly</MenuItem>
				</Menu>
			</div>
		</Stack>
	);
}

export default ChartControls;