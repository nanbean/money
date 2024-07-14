import React from 'react';

import Box from '@mui/material/Box';

const Container = React.forwardRef(function Container ({ children, ...props }, ref) {
	return (
		<Box p={{ xs: 1, sm: 2 }} ref={ref} {...props}>
			{children}
		</Box>
	);
});

export default Container;