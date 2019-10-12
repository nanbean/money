import React from 'react';
import PropTypes from 'prop-types';

import {
	getCategoryColor
} from '../../utils/categoryColor';

function Payee (props) {
	const { showColor, value, category } = props;

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
	value: PropTypes.string.isRequired,
	category: PropTypes.string,
	showColor: PropTypes.bool
};

export default Payee;
