import React from 'react';
import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import NumbersIcon from '@mui/icons-material/Numbers';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

export function TypeToggle ({
	type,
	onTypeChange
}) {
	return (
		<Stack spacing={2} direction="row" justifyContent="flex-end" sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingBottom: theme.spacing(1)
		})}>
			<ToggleButtonGroup size="small" value={type} onChange={onTypeChange} exclusive aria-label="types">
				<ToggleButton value="quantity" key="quantity">
					<NumbersIcon />
				</ToggleButton>,
				<ToggleButton value="amount" key="amount">
					<AttachMoneyIcon />
				</ToggleButton>
			</ToggleButtonGroup>
		</Stack>
	);
}

TypeToggle.propTypes = {
	onTypeChange: PropTypes.func.isRequired,
	type: PropTypes.string.isRequired
};

export default TypeToggle;
