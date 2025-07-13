import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { toCurrencyFormat, toCurrencyFormatWithSymbol } from '../utils/formatting';

import	{
	POSITIVE_AMOUNT_DARK_COLOR,
	POSITIVE_AMOUNT_LIGHT_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../constants';

function Amount ({
	currency = 'KRW',
	ignoreDisplayCurrency = false,
	negativeColor = false,
	showColor = true,
	showOriginal = false,
	showSymbol = false,
	size = '',
	value
}) {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings);

	const displayValue = useMemo(() => {
		const validExchangeRate = (typeof exchangeRate === 'number' && exchangeRate !== 0) ? exchangeRate : 1;
		if (ignoreDisplayCurrency) {
			return value;
		} else if (currency === displayCurrency) {
			return value;
		} else {
			if (currency === 'KRW') {
				return value / validExchangeRate;
			}
			return value * validExchangeRate;
		}
	}, [currency, displayCurrency, ignoreDisplayCurrency, value, exchangeRate]);

	let amountText;
	const currencyForDisplaySymbol = ignoreDisplayCurrency ? currency : displayCurrency;

	if (showSymbol) {
		amountText = toCurrencyFormatWithSymbol(displayValue, currencyForDisplaySymbol);
		if (showOriginal && displayValue !== value) {
			amountText += ` (${toCurrencyFormatWithSymbol(value, currency)})`;
		}
	} else {
		amountText = toCurrencyFormat(displayValue);
	}

	return (
		<Typography
			variant={size === 'large' ? 'subtitle1' : (size === 'small' ? 'caption' : 'body2')}
			sx={{
				color: showColor
					? (negativeColor && value < 0
						? NEGATIVE_AMOUNT_COLOR
						: (value > 0
							? (isDarkMode ? POSITIVE_AMOUNT_DARK_COLOR : POSITIVE_AMOUNT_LIGHT_COLOR)
							: undefined)
					)
					: undefined
			}}
		>
			{amountText}
		</Typography >
	);
}

Amount.propTypes = {
	currency: PropTypes.string,
	ignoreDisplayCurrency: PropTypes.bool,
	negativeColor: PropTypes.bool,
	showColor: PropTypes.bool,
	showOriginal: PropTypes.bool,
	showSymbol: PropTypes.bool,
	size: PropTypes.string,
	value: PropTypes.number
};

export default Amount;
