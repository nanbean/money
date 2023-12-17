import React from 'react';
import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import NumbersIcon from '@mui/icons-material/Numbers';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarViewYearlyIcon from '@mui/icons-material/CalendarViewMonth';
import CalendarViewMonthlyIcon from '@mui/icons-material/CalendarViewWeek';

export function TypeRangeToggles ({
	range,
	type,
	onRangeChange,
	onTypeChange
}) {
	const typeChildren = [
		<ToggleButton value="quantity" key="quantity">
			<NumbersIcon />
		</ToggleButton>,
		<ToggleButton value="amount" key="amount">
			<AttachMoneyIcon />
		</ToggleButton>
	];

	const rangeChildren = [
		<ToggleButton value="monthly" key="monthly">
			<CalendarViewMonthlyIcon />
		</ToggleButton>,
		<ToggleButton value="yearly" key="yearly">
			<CalendarViewYearlyIcon />
		</ToggleButton>
	];

	const control = {
		value: type,
		onChange: onTypeChange,
		exclusive: true
	};

	const control2 = {
		value: range,
		onChange: onRangeChange,
		exclusive: true
	};

	return (
		<Stack spacing={2} direction="row" justifyContent="flex-end" sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingBottom: theme.spacing(1)
		})}>
			<ToggleButtonGroup size="small" {...control} aria-label="Small sizes">
				{typeChildren}
			</ToggleButtonGroup>
			<ToggleButtonGroup size="small" {...control2} aria-label="Small sizes">
				{rangeChildren}
			</ToggleButtonGroup>
		</Stack>
	);
}

TypeRangeToggles.propTypes = {
	onRangeChange: PropTypes.func.isRequired,
	onTypeChange: PropTypes.func.isRequired,
	range: PropTypes.string.isRequired,
	type: PropTypes.string.isRequired
};

export default TypeRangeToggles;
