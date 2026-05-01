import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import Layout from '../Layout';
import MobileMenuButton from '../MobileMenuButton';
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
				color: T.ink,
				maxWidth: 1320,
				padding: { xs: '16px 16px 32px', md: '24px 32px 60px' },
				minHeight: '100vh'
			}}>
				{loading && (
					<LinearProgress color="primary" sx={{ marginBottom: '20px', borderRadius: '4px' }} />
				)}
				<Box sx={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
					<Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
						<MobileMenuButton />
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
