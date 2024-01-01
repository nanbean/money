import React from 'react';
import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';

import TypeToggle from '../../components/TypeToggle';
import RangeToggle from '../../components/RangeToggle';

export function TypeRangeToggles ({
	range,
	type,
	onRangeChange,
	onTypeChange
}) {
	return (
		<Stack spacing={2} direction="row" justifyContent="flex-end" sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingBottom: theme.spacing(1)
		})}>
			<TypeToggle type={type} onTypeChange={onTypeChange} />
			<RangeToggle range={range} onRangeChange={onRangeChange} />
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
