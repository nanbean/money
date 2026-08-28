import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { toCurrencyFormat, toCurrencyFormatWithSymbol } from '../utils/formatting';
import { fmtCurrency } from '../utils/designTokens';

import	{
	POSITIVE_AMOUNT_DARK_COLOR,
	POSITIVE_AMOUNT_LIGHT_COLOR,
	NEGATIVE_AMOUNT_COLOR
} from '../constants';

function Amount ({
	// 만/억 단위로 줄여서 표시한다 (₩1,475만, ₩1.47억). 열이 좁은 표에서 쓴다.
	// 홈·Spending 화면이 이미 같은 포맷(fmtCurrency)을 쓴다.
	compact = false,
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

	if (compact) {
		// fmtCurrency 는 0 도 '₩0' 로 내므로 빈 셀과 구분된다.
		amountText = fmtCurrency(displayValue, currencyForDisplaySymbol);
	} else if (showSymbol) {
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
					: undefined,
				// Amounts should never wrap — narrow grid cells were splitting
				// long values across two lines. Truncate with ellipsis instead.
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'ellipsis'
			}}
		>
			{amountText}
		</Typography >
	);
}

Amount.propTypes = {
	compact: PropTypes.bool,
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
