import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {Message} from 'semantic-ui-react';

import TitleHeader from '../components/TitleHeader';

import {getNotificationHistoryAction} from '../actions/notificationActions';

class NotificationLog extends Component {
	componentDidMount () {
		this.props.getNotificationHistoryAction();
	}

	render () {
		const {notificationHistory} = this.props;

		return (
			<div>
				<TitleHeader title="Notification Log" />
				<div className="container-full-page">
					{
						notificationHistory.map(i => {
							return (
								<div className="container-item" key={i}>
									<Message>
										{i}
									</Message>
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
	getNotificationHistoryAction: PropTypes.func.isRequired,
	notificationHistory: PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	notificationHistory: state.notificationHistory
});

const mapDispatchToProps = dispatch => ({
	getNotificationHistoryAction () {
		dispatch(getNotificationHistoryAction());
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(NotificationLog);
