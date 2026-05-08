import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import Layout from '../Layout';
import useT from '../../hooks/useT';
import { sDisplay } from '../../utils/designTokens';

function DesignPage ({
	title,
	titleKo,
	subtitle,
	loading,
	headerRight,
	fillViewport = false,
	children
}) {
	const T = useT();

	// fillViewport: page exactly fits the viewport on md+ — title/header at the
	// top, then a flex:1 children container so a virtualized list at the bottom
	// scrolls inside itself instead of the page.
	const outerSx = {
		background: T.bg,
		color: T.ink,
		maxWidth: 1320,
		padding: { xs: '16px 16px 32px', md: '24px 32px 60px' }
	};
	if (fillViewport) {
		outerSx.minHeight = { xs: '100vh', md: 0 };
		outerSx.height = { md: '100vh' };
		outerSx.display = { md: 'flex' };
		outerSx.flexDirection = { md: 'column' };
		outerSx.overflow = { md: 'hidden' };
	} else {
		outerSx.minHeight = '100vh';
	}

	return (
		<Layout showPaper={false} title={title}>
			<Box sx={outerSx}>
				{loading && (
					<LinearProgress color="primary" sx={{ marginBottom: '20px', borderRadius: '4px' }} />
				)}
				<Box sx={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
					<Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
						<Box sx={{ minWidth: 0 }}>
							<Typography
								component="h1"
								sx={{
									...sDisplay,
									fontSize: { xs: 24, md: 32 },
									fontWeight: 700,
									color: T.ink,
									margin: 0,
									lineHeight: 1.2
								}}
							>
								{title}
								{titleKo && (
									<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: { xs: 14, md: 18 }, marginLeft: '10px' }}>
										· {titleKo}
									</Box>
								)}
							</Typography>
							{subtitle && (
								<Typography sx={{ fontSize: 13, color: T.ink2, marginTop: '6px' }}>{subtitle}</Typography>
							)}
						</Box>
					</Stack>
					{headerRight}
				</Box>
				{fillViewport ? (
					<Box sx={{
						// flex column on all sizes so `gap` applies on mobile too
						// (display:block doesn't honor gap). Desktop additionally
						// uses flex:1 to fill the viewport-fit ancestor.
						display: 'flex',
						flexDirection: 'column',
						gap: 2,
						flex: { md: 1 },
						minHeight: { md: 0 }
					}}>
						{children}
					</Box>
				) : children}
			</Box>
		</Layout>
	);
}

DesignPage.propTypes = {
	title: PropTypes.string.isRequired,
	children: PropTypes.node,
	fillViewport: PropTypes.bool,
	headerRight: PropTypes.node,
	loading: PropTypes.bool,
	subtitle: PropTypes.node,
	titleKo: PropTypes.string
};

export default DesignPage;
