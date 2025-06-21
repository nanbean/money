import React from 'react';
import PropTypes from 'prop-types';
import Typography from '@mui/material/Typography';

function Quantity ({
	size = '',
	value
}) {
	const amountText = typeof value === 'number' ? value.toLocaleString() : '';

	return (
		<Typography
			variant={size === 'large' ? 'subtitle1' : (size === 'small' ? 'caption' : 'body2')}
		>
			{amountText}
		</Typography>
	);
}

Quantity.propTypes = {
	size: PropTypes.string,
	value: PropTypes.number
};

export default Quantity;
