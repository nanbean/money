import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';

const TossIcon = ({ sx }) => (
	<Box
		component="img"
		src="https://money.nanbean.net/logo-toss.png"
		alt="Toss Icon"
		sx={{
			borderRadius: '50%',
			...sx
		}}
	/>
);

TossIcon.propTypes = {
	sx: PropTypes.object
};

export default TossIcon;