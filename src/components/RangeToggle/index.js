import React from 'react';
import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CalendarViewYearlyIcon from '@mui/icons-material/CalendarViewMonth';
import CalendarViewMonthlyIcon from '@mui/icons-material/CalendarViewWeek';

export function RangeToggle ({
	range,
	onRangeChange
}) {
	return (
		<Stack spacing={2} direction="row" justifyContent="flex-end" sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingBottom: theme.spacing(1)
		})}>
			<ToggleButtonGroup size="small" value={range} onChange={onRangeChange} exclusive aria-label="ranges">
				<ToggleButton value="monthly" key="monthly">
					<CalendarViewMonthlyIcon />
				</ToggleButton>,
				<ToggleButton value="yearly" key="yearly">
					<CalendarViewYearlyIcon />
				</ToggleButton>
			</ToggleButtonGroup>
		</Stack>
	);
}

RangeToggle.propTypes = {
	onRangeChange: PropTypes.func.isRequired,
	range: PropTypes.string.isRequired
};

export default RangeToggle;
