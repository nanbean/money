import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';

import TitleHeader from '../components/TitleHeader';

import { getNotificationsAction } from '../actions/notificationActions';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing.unit * 3,
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	},
	paper: {
		marginTop: theme.spacing.unit * 2,
		padding: theme.spacing.unit
	}
});

class NotificationLog extends Component {
	componentDidMount () {
		this.props.getNotificationsAction();
	}

	render () {
		const { classes, notifications } = this.props;

		return (
			<div>
				<TitleHeader title="Notification Log" />
				<div className={classes.container}>
					{
						notifications.map(i => {
							return (
								<Paper key={i} className={classes.paper}>
									{i}
								</Paper >
							);
						})
					}
				</div>
			</div>
		);
	}
}

NotificationLog.propTypes = {
	classes: PropTypes.object.isRequired,
	getNotificationsAction: PropTypes.func.isRequired,
	notifications: PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	notifications: state.notifications
});

const mapDispatchToProps = dispatch => ({
	getNotificationsAction () {
		dispatch(getNotificationsAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(NotificationLog));
