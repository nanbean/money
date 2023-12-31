import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import useCategoryColor from '../../hooks/useCategoryColor';

function Payee ({
	showColor,
	value,
	category
}) {
	if (showColor && category) {
		return (
			<Typography
				variant="body2"
				sx={{ color: useCategoryColor(category) }}
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

Payee.defaultProps = {
	showColor: true
};

Payee.propTypes = {
	category: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
	showColor: PropTypes.bool
};

export default Payee;
