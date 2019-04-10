import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import TitleHeader from '../components/TitleHeader';

import {
	requestPermissionAction,
	removePermissionAction
} from '../actions/messagingActions';

const styles = theme => ({
	container: {
		maxWidth: 1200,
		margin: '1em auto'
	},
	paper: {
		[theme.breakpoints.up('lg')]: {
			marginTop: theme.spacing.unit * 2
		},
		[theme.breakpoints.down('sm')]: {
			marginTop: 0
		},
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 3}px ${theme.spacing.unit * 3}px`
	},
	log: {
		marginTop: theme.spacing.unit * 3
	}
});

class Setting extends Component {
	handleRegisterMessagingToken = () => {
		this.props.requestPermissionAction();
	}

	handleUnregisterMessagingToken = () => {
		this.props.removePermissionAction();
	}

	handleNotificationLog = () => {
		this.props.history.push('/notificationlog');
	}

	handlePushNotificationChange = (e, data) => {
		if (data.checked) {
			this.props.requestPermissionAction();
		} else {
			this.props.removePermissionAction();
		}
	}

	render () {
		const { classes, messagingToken } = this.props;

		return (
			<div>
				<TitleHeader title="Setting" />
				<div className={classes.container}>
					<Paper className={classes.paper}>
						<FormGroup>
							<FormControlLabel
								control={
									<Switch checked={messagingToken ? true : false} onChange={this.handlePushNotificationChange} aria-label="PushSwitch" />
								}
								label="푸쉬 알림 받기"
							/>
						</FormGroup>
						<Button
							fullWidth
							variant="contained"
							color="primary"
							className={classes.log}
							onClick={this.handleNotificationLog}
						>
							Notification Log
						</Button>
					</Paper>
				</div>
			</div>
		);
	}
}

Setting.propTypes = {
	classes: PropTypes.object.isRequired,
	history: PropTypes.shape({
		push: PropTypes.func.isRequired
	}).isRequired,
	messagingToken: PropTypes.string.isRequired,
	removePermissionAction: PropTypes.func.isRequired,
	requestPermissionAction: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
	messagingToken: state.messagingToken
});

const mapDispatchToProps = dispatch => ({
	removePermissionAction () {
		dispatch(removePermissionAction());
	},
	requestPermissionAction () {
		dispatch(requestPermissionAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Setting));
