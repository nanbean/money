import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	withRouter
} from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';

import { toggleSidebar } from '../../actions/uiActions';

const styles = theme => ({
	appBar: {
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

class Header extends Component {
	render () {
		const {
			classes,
			toggleSidebar
		} = this.props;
		
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
						Moneyy
					</Typography>
					{/* <div>
						{
							username &&
								<Link key="/logOut" to="/" className={classes.link}>
									<Button color="inherit" onClick={this.handleSignout}>Signout</Button>
								</Link>
						}
						{
							!username &&
								<Link key="/signin" to="/signin" className={classes.link}>
									<Button color="inherit">Signin</Button>
								</Link>
						}
						{
							!username &&
								<Link key="/signup" to="/signup" className={classes.link}>
									<Button color="inherit">Signup</Button>
								</Link>
						}
					</div> */}
				</Toolbar>
			</AppBar>
		);
	}
}

Header.propTypes = {
	classes: PropTypes.object.isRequired,
	toggleSidebar: PropTypes.func.isRequired,
	username: PropTypes.string.isRequired
};

const mapStateToProps = state => ({
	username: state.username
});

export default withRouter(connect(
	mapStateToProps,
	{ toggleSidebar }
)(withStyles(styles)(Header)));
