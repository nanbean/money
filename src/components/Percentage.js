import React from 'react';
import PropTypes from 'prop-types';

import { toPercentFormat } from '../utils/formatting';

const Percentage = ({
	value,
	showColor = true
}) => (
	<span
		className={`mono ${showColor && (value >= 0 ? 'positive' : 'negative')}`}
	>
		{toPercentFormat(value)}
	</span>
);

Percentage.propTypes = {
	value: PropTypes.number.isRequired,
	showColor: PropTypes.bool
};

export default Percentage;
