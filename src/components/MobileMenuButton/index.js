import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';

import useT from '../../hooks/useT';
import { toggleSidebar } from '../../actions/uiActions';

function MobileMenuButton () {
	const dispatch = useDispatch();
	// Match the same breakpoint the Drawer uses to collapse to width 0 (theme.breakpoints.down('sm') = <600px).
	// Wider than that, the permanent sidebar is visible and a floating menu button would overlay its brand.
	const isCollapsedScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'));
	const isSidebarOpen = useSelector((state) => state.ui.isSidebarOpen);
	const T = useT();

	if (!isCollapsedScreen || isSidebarOpen) return null;

	return (
		<IconButton
			aria-label="Open navigation"
			onClick={() => dispatch(toggleSidebar())}
			sx={{
				position: 'fixed',
				top: 12,
				left: 12,
				zIndex: 1300,
				background: T.surf,
				border: `1px solid ${T.rule}`,
				color: T.ink,
				borderRadius: '12px',
				padding: '8px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
				'&:hover': { background: T.surf2 }
			}}
		>
			<MenuIcon sx={{ fontSize: 20 }} />
		</IconButton>
	);
}

export default MobileMenuButton;
