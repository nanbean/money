import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import { getCategoryColor } from '../../utils/categoryColor';

function Payee ({
	showColor = true,
	value,
	category
}) {
	const color = getCategoryColor(category);
	
	if (showColor && category) {
		return (
			<Typography
				variant="body2"
				sx={{ color }}
			>
				{value}
			</Typography >
		);
	}

	return (
		<span>
			{value}
		</span>
	);
}

Payee.propTypes = {
	category: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
	showColor: PropTypes.bool
};

export default Payee;
