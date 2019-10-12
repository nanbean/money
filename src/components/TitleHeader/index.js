import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	withRouter,
	Link
} from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Button from '@material-ui/core/Button';

import { toggleSidebar } from '../../actions/uiActions';
import { logoutAction } from '../../actions/authActions';

const styles = theme => ({
	appBar: {
		flexGrow: 1,
		zIndex: theme.zIndex.drawer + 1,
		transition: theme.transitions.create(['margin', 'width'], {
			easing: theme.transitions.easing.sharp,
			duration: theme.transitions.duration.leavingScreen
		})
	},
	menuButton: {
		marginLeft: -12
	},
	grow: {
		flexGrow: 1
	},
	link: {
		textDecoration: 'none',
		color: 'inherit'
	}
});

function TitleHeader (props) {
	const {
		classes,
		title,
		toggleSidebar,
		username
	} = props;
	const handleSignout = () => {
		props.logoutAction();
	};

	return (
		<AppBar
			position="fixed"
			className={classes.appBar}
		>
			<Toolbar>
				<IconButton
					color="inherit"
					aria-label="Open drawer"
					className={classes.menuButton}
					onClick={toggleSidebar}
				>
					<MenuIcon />
				</IconButton>
				<Typography variant="h6" color="inherit" className={classes.grow}>
					{title}
				</Typography>
				<div>
					{
						username &&
						<Link key="/logOut" to="/" className={classes.link}>
							<Button color="inherit" onClick={handleSignout}>Signout</Button>
						</Link>
					}
					{
						!username &&
						<Link key="/signin" to="/signin" className={classes.link}>
							<Button color="inherit">Signin</Button>
						</Link>
					}
				</div>
			</Toolbar>
		</AppBar>
	);
}

TitleHeader.propTypes = {
	classes: PropTypes.object.isRequired,
	logoutAction: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	toggleSidebar: PropTypes.func.isRequired,
	username: PropTypes.string.isRequired
};

const mapStateToProps = state => ({
	username: state.username
});

const mapDispatchToProps = dispatch => ({
	logoutAction () {
		dispatch(logoutAction());
	},
	toggleSidebar () {
		dispatch(toggleSidebar());
	}
});


export default withRouter(connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(TitleHeader)));
