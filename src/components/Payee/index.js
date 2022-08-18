import React from 'react';
import PropTypes from 'prop-types';

import {
	getCategoryColor
} from '../../utils/categoryColor';

function Payee ({
	showColor,
	value,
	category
}) {
	if (showColor && category) {
		return (
			<span style={{ color: getCategoryColor(category) }}>
				{value}
			</span>
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
	value: PropTypes.number.isRequired,
	showColor: PropTypes.bool
};

export default Payee;
