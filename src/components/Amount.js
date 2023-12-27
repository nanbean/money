import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import { toCurrencyFormat } from '../utils/formatting';

const Amount = ({
	value,
	showColor = true
}) => (
	<Typography
		variant="body2"
		gutterBottom
		sx={showColor && value < 0 ?{
			color: '#017eff'
		}:{}}
	>
		{toCurrencyFormat(value)}
	</Typography >
);

Amount.propTypes = {
	showColor: PropTypes.bool,
	value: PropTypes.number
};

export default Amount;
