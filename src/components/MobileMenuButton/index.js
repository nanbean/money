import React from 'react';
import { useDispatch } from 'react-redux';

import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

import useT from '../../hooks/useT';
import useMobile from '../../hooks/useMobile';
import { toggleSidebar } from '../../actions/uiActions';

// Inline menu trigger rendered inside page headers on mobile. Returns null on
// desktop (sidebar is always visible there). Keeping the button inline — instead
// of as a fixed-position floater — prevents it from overlapping page titles.
function MobileMenuButton () {
	const dispatch = useDispatch();
	const isMobile = useMobile();
	const T = useT();

	if (!isMobile) return null;

	return (
		<IconButton
			aria-label="Open navigation"
			onClick={() => dispatch(toggleSidebar())}
			sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				color: T.ink,
				borderRadius: '12px',
				padding: '8px',
				flexShrink: 0,
				'&:hover': { background: T.surf2 }
			}}
		>
			<MenuIcon sx={{ fontSize: 20 }} />
		</IconButton>
	);
}

export default MobileMenuButton;
