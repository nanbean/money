import React from 'react';
import PropTypes from 'prop-types';
import {toCurrencyFormat} from '../utils/formatting';

const Amount = ({value, showColor = true}) => (
	<span
		className={`${showColor && (value >= 0 ? 'neutral' : 'negative')}`}
	>
		{toCurrencyFormat(value)}
	</span>
);

Amount.propTypes = {
	showColor: PropTypes.bool,
	value: PropTypes.number
};

export default Amount;
