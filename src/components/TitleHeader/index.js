import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';

import { toggleSidebar } from '../../actions/uiActions';

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
	}
});

const TitleHeader = ({
	classes,
	title,
	toggleSidebar
}) => (
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
		</Toolbar>
	</AppBar>
);

TitleHeader.propTypes = {
	classes: PropTypes.object.isRequired,
	title: PropTypes.string.isRequired,
	toggleSidebar: PropTypes.func.isRequired
};

export default connect(
	null,
	{ toggleSidebar }
)(withStyles(styles)(TitleHeader));
