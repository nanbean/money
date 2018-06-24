import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Button, Checkbox } from 'semantic-ui-react';

import TitleHeader from '../components/TitleHeader';

import {
	requestPermissionAction,
	removePermissionAction
} from '../actions/messagingActions';

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
		const { messagingToken } = this.props;

		return (
			<div>
				<TitleHeader title='Setting' />
				<div className='container-full-page'>
					<div className="container-item">
						<Checkbox toggle label='푸쉬 알림 받기' checked={messagingToken} onChange={this.handlePushNotificationChange} />
					</div>
					<div className="container-item">
						<Button
							fluid
							content="Notification Log"
							onClick={this.handleNotificationLog}
						/>
					</div>
				</div>
			</div>
		);
	}
}

Setting.propTypes = {
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
)(Setting);
