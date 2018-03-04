import React from 'react';
import PropTypes from 'prop-types';
import { toCurrencyFormat } from '../utils/formatting';

const Amount = ({ value, showColor = true }) => (
	<span
		className={`${showColor && (value >= 0 ? 'neutral' : 'negative')}`}
	>
		{toCurrencyFormat(value)}
	</span>
);

Amount.propTypes = {
	value: PropTypes.number,
	showColor: PropTypes.bool
};

export default Amount;
