import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
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
	children
}) {
	const T = useT();

	return (
		<Layout showPaper={false} title={title}>
			<Box sx={{
				background: T.bg,
				borderRadius: { xs: 0, md: '20px' },
				padding: { xs: '16px', md: '32px' },
				color: T.ink,
				minHeight: 'calc(100vh - 32px)'
			}}>
				{loading && (
					<LinearProgress color="primary" sx={{ marginBottom: '20px', borderRadius: '4px' }} />
				)}
				<Box sx={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
					<Box>
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
					{headerRight}
				</Box>
				{children}
			</Box>
		</Layout>
	);
}

DesignPage.propTypes = {
	title: PropTypes.string.isRequired,
	children: PropTypes.node,
	headerRight: PropTypes.node,
	loading: PropTypes.bool,
	subtitle: PropTypes.node,
	titleKo: PropTypes.string
};

export default DesignPage;
