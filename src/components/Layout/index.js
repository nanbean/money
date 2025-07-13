import React from 'react';
import PropTypes from 'prop-types';

import { styled } from '@mui/material/styles';

import Paper from '@mui/material/Paper';

import TitleHeader from '../TitleHeader';
import Container from '../Container';

const Toolbar = styled('div')(({ theme }) => ({
	...theme.mixins.toolbar
}));

function Layout ({ title, showPaper = true, children }) {
	const content = showPaper ? (
		<Paper
			sx={{
				p: { xs: 0.5, sm: 1 },
				height: {
					xs: 'calc(100vh - 72px)', // 56px (App Bar) + 56px (bottom navigation) = 112px
					sm: 'calc(100vh - 98px)'  // 64px (App Bar) + 64px (bottom navigation) = 128px
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
			<TitleHeader title={title} />
			<Toolbar />
			<Container>{content}</Container>
		</>
	);
}

Layout.propTypes = {
	children: PropTypes.node.isRequired,
	title: PropTypes.string.isRequired,
	showPaper: PropTypes.bool
};

export default Layout;
