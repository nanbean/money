import React from 'react';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import useDarkMode from '../hooks/useDarkMode';

import { toCurrencyFormat, toCurrencyFormatWithSymbol } from '../utils/formatting';

function Amount ({
	currency = 'KRW',
	showColor = true,
	showSymbol = false,
	value
}) {
	const isDarkMode = useDarkMode();

	return (
		<Typography
			variant="body2"
			sx={showColor && value > 0 ?{
				color: isDarkMode ? 'rgb(125, 216, 161)':'rgb(40, 131, 76)'
			}:{}}
		>
			{showSymbol ? toCurrencyFormatWithSymbol(value, currency):toCurrencyFormat(value)}
		</Typography >
	);
}

Amount.propTypes = {
	currency: PropTypes.string,
	showColor: PropTypes.bool,
	value: PropTypes.number
};

export default Amount;
