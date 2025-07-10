import React, { useState } from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FilterListIcon from '@mui/icons-material/FilterList';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

export function AccountFilter ({
	allAccounts,
	filteredAccounts,
	setfilteredAccounts
}) {
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	const handleClick = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const onFilteredAccountsChange = (account, isChecked) => {
		const isPresent = filteredAccounts.includes(account);

		if (isChecked && !isPresent) {
			setfilteredAccounts([...filteredAccounts, account]);
		} else if (!isChecked && isPresent) {
			setfilteredAccounts(filteredAccounts.filter((i) => i !== account));
		}
	};

	const onAllAccountClick = (event) => {
		const { checked } = event.target;
		if (checked) {
			setfilteredAccounts([...allAccounts]);
		} else {
			setfilteredAccounts([]);
		}
	};

	return (
		<div>
			<Button
				id="account-filter-button"
				aria-controls={open ? 'account-filter-menu' : undefined}
				aria-haspopup="true"
				aria-expanded={open ? 'true' : undefined}
				onClick={handleClick}
				size="small"
				startIcon={<FilterListIcon />}
				sx={{ textTransform: 'none' }}
			>
				Filter ({filteredAccounts.length})
			</Button>
			<Menu
				id="account-filter-menu"
				anchorEl={anchorEl}
				open={open}
				onClose={handleClose}
				MenuListProps={{ 'aria-labelledby': 'account-filter-button' }}
			>
				<Box sx={{ pl: 2, pr: 2, maxHeight: 500, overflowY: 'auto' }}>
					{allAccounts && allAccounts.map((j) => (
						<FormControlLabel
							key={j}
							control={<Checkbox size="small" checked={filteredAccounts.includes(j)} onChange={(e) => onFilteredAccountsChange(j, e.target.checked)} />}
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
								checked={allAccounts.length > 0 && filteredAccounts.length === allAccounts.length}
								onChange={onAllAccountClick}
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

AccountFilter.propTypes = {
	allAccounts: PropTypes.array.isRequired,
	filteredAccounts: PropTypes.array.isRequired,
	setfilteredAccounts: PropTypes.func.isRequired
};

export default AccountFilter;
