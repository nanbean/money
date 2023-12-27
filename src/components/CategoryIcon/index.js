import React from 'react';
import PropTypes from 'prop-types';

import Avatar from '@mui/material/Avatar';

import { getCategoryIcon } from '../../utils/categoryIcon';
import useCategoryColor from '../../hooks/useCategoryColor';

export function CategoryIcon ({
	category,
	fontsize
}) {
	const bgcolor = useCategoryColor(category);
	const sx = { bgcolor, margin: 'auto' };
	if (fontsize) {
		sx.width = fontsize + 5;
		sx.height = fontsize + 5;
	}

	return (
		<Avatar sx={sx} variant="rounded">
			{getCategoryIcon(category, fontsize)}
		</Avatar>
	);
}

CategoryIcon.propTypes = {
	category: PropTypes.string.isRequired,
	fontsize: PropTypes.number.isRequired
};

export default CategoryIcon;
