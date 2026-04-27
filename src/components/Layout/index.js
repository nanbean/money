import React from 'react';
import PropTypes from 'prop-types';

import Paper from '@mui/material/Paper';

import GlobalProgress from '../GlobalProgress';
import Container from '../Container';

function Layout ({ title, loading, showPaper = true, children }) {
	const content = showPaper ? (
		<Paper
			sx={{
				p: { xs: 0.5, sm: 1 },
				height: {
					xs: 'calc(100vh - 16px)',
					sm: 'calc(100vh - 24px)'
				},
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			{children}
		</Paper>
	) : (
		<>{children}</>
	);

	return (
		<>
			<GlobalProgress loading={loading} />
			<Container>{content}</Container>
		</>
	);
}

Layout.propTypes = {
	children: PropTypes.node.isRequired,
	loading: PropTypes.bool,
	showPaper: PropTypes.bool,
	title: PropTypes.string
};

export default Layout;
