import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import useT from '../hooks/useT';
import { extractMemoTags } from '../utils/memoTags';

// Lightweight inline tag preview for memo input fields. Renders nothing when
// no recognized tags are present, so it doesn't add visual noise to ordinary
// transactions.
function MemoTagPreview ({ memo }) {
	const T = useT();
	const tags = extractMemoTags(memo || '');
	if (tags.length === 0) return null;

	const chipBg = T.dark ? 'rgba(96,165,250,0.14)' : 'rgba(59,130,246,0.10)';
	const chipFg = T.acc.hero;

	return (
		<Stack direction="row" spacing={0.5} sx={{ marginTop: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
			{tags.map((tag, i) => (
				<Box
					key={`${tag.id}-${i}`}
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						background: chipBg,
						color: chipFg,
						padding: '2px 8px',
						borderRadius: '999px',
						fontSize: 11,
						fontWeight: 600,
						lineHeight: 1.4
					}}
				>
					{tag.label}
				</Box>
			))}
		</Stack>
	);
}

MemoTagPreview.propTypes = {
	memo: PropTypes.string
};

export default MemoTagPreview;
