import React, { useState } from 'react';
import PropTypes from 'prop-types';

import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import FilterListIcon from '@mui/icons-material/FilterList';

export function AccountFilter ({
	allAccounts,
	filteredAccounts,
	setfilteredAccounts
}) {
	const [isExpanded, setIsExpanded] = useState(false);

	const handleToggleExpand = () => setIsExpanded(!isExpanded);

	const onFilteredAccountsChange = (account, isChecked) => {
		const isPresent = filteredAccounts.includes(account);

		if (isChecked && !isPresent) {
			setfilteredAccounts([...filteredAccounts, account]);
		} else if (!isChecked && isPresent) {
			setfilteredAccounts(filteredAccounts.filter(i => i !== account));
		}
	};

	const onAllAccountClick = event => {
		const { checked } = event.target;
		if (checked) {
			setfilteredAccounts([...allAccounts]);
		} else {
			setfilteredAccounts([]);
		}
	};

	return (
		<Paper sx={{ p: 1 }}>
			<Stack spacing={1}>
				<Stack direction="row" spacing={1} alignItems="center">
					{!isExpanded && (
						<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexGrow: 1 }}>
							{filteredAccounts.map(item => (
								<Chip
									key={item}
									label={item}
									onDelete={() => onFilteredAccountsChange(item, false)}
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
						Filter ({filteredAccounts.length} / {allAccounts.length})
					</Button>
				</Stack>

				<Collapse in={isExpanded}>
					<Stack sx={{ pl: 1, maxHeight: 300, overflowY: 'auto' }}>
						{allAccounts && allAccounts.map(j => (
							<FormControlLabel
								key={j}
								control={
									<Checkbox
										sx={{ py: 0.5 }}
										size="small"
										checked={filteredAccounts.includes(j)}
										onChange={(e) => onFilteredAccountsChange(j, e.target.checked)}
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
									checked={allAccounts.length > 0 && filteredAccounts.length === allAccounts.length}
									onChange={onAllAccountClick}
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

AccountFilter.propTypes = {
	allAccounts: PropTypes.array.isRequired,
	filteredAccounts: PropTypes.array.isRequired,
	setfilteredAccounts: PropTypes.func.isRequired
};

export default AccountFilter;
