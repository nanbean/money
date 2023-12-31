import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import useDarkMode from '../hooks/useDarkMode';

import { toCurrencyFormat } from '../utils/formatting';

const Amount = ({
	value,
	showColor = true
}) => (
	<Typography
		variant="body2"
		sx={showColor && value > 0 ?{
			color: useDarkMode() ? 'rgb(125, 216, 161)':'rgb(40, 131, 76)'
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
