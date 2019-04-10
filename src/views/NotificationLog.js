import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Paper from '@material-ui/core/Paper';

import TitleHeader from '../components/TitleHeader';

import { getNotificationsAction } from '../actions/notificationActions';

class NotificationLog extends Component {
	componentDidMount () {
		this.props.getNotificationsAction();
	}

	render () {
		const { notifications } = this.props;

		return (
			<div>
				<TitleHeader title="Notification Log" />
				<div className="container-full-page">
					{
						notifications.map(i => {
							return (
								<div className="container-item" key={i}>
									<Paper >
										{i}
									</Paper >
								</div>
							);
						})
					}
				</div>
			</div>
		);
	}
}

NotificationLog.propTypes = {
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
)(NotificationLog);
