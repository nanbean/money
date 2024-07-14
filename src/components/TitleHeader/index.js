import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';

import MenuIcon from '@mui/icons-material/Menu';

import { toggleSidebar } from '../../actions/uiActions';
import { logoutAction } from '../../actions/authActions';

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

function TitleHeader ({
	title,
	loading
}) {
	const username = useSelector((state) => state.username);
	const dispatch = useDispatch();
	const trascationsFetching = useSelector((state) => state.trascationsFetching);
	const updateInvestmentPriceFetching = useSelector((state) => state.updateInvestmentPriceFetching);

	const handleSignout = () => {
		dispatch(logoutAction());
	};

	const handleToggleSideBar = () => {
		dispatch(toggleSidebar());
	};

	return (
		<React.Fragment>
			<AppBar
				position="fixed"
			>
				<Toolbar>
					<IconButton
						color="inherit"
						aria-label="Open drawer"
						onClick={handleToggleSideBar}
						sx={{ marginLeft: -2 }}
					>
						<MenuIcon />
					</IconButton>
					<Typography variant="h6" color="inherit" sx={{ flexGrow: 1 }}>
						{title}
					</Typography>
					<div>
						{
							username &&
							<Link key="/logOut" to="/" style={linkStyle}>
								<Button color="inherit" onClick={handleSignout}>Signout</Button>
							</Link>
						}
						{
							!username &&
							<Link key="/signin" to="/signin" style={linkStyle}>
								<Button color="inherit">Signin</Button>
							</Link>
						}
					</div>
				</Toolbar>
			</AppBar>
			{
				(updateInvestmentPriceFetching || trascationsFetching || loading) &&
					<LinearProgress color="secondary"/>
			}
		</React.Fragment>
	);
}

TitleHeader.propTypes = {
	title: PropTypes.string.isRequired,
	loading: PropTypes.bool
};

export default TitleHeader;
