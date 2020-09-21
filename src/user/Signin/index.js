import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { Redirect } from 'react-router-dom';

import TitleHeader from '../../components/TitleHeader';

import SigninForm from '../SigninForm';

import {
	loginAction
} from '../../actions/authActions';

const styles = theme => ({
	container: {
		flexGrow: 1,
		padding: theme.spacing(3),
		[theme.breakpoints.down('sm')]: {
			padding: 0
		}
	}
});

export class Signin extends Component {
	render () {
		const { classes } = this.props;

		if (this.props.username) {
			return <Redirect to="/" />;
		}

		return (
			<React.Fragment>
				<TitleHeader title="Home" />
				<div className={classes.container}>
					<SigninForm
						loginAction={this.props.loginAction}
					/>
				</div>
			</React.Fragment>
		);
	}
}

Signin.propTypes = {
	classes: PropTypes.object.isRequired,
	loginAction: PropTypes.func.isRequired,
	username: PropTypes.string.isRequired
};

/* istanbul ignore next */
const mapStateToProps = state => ({
	username: state.username
});

/* istanbul ignore next */
const mapDispatchToProps = dispatch => ({
	loginAction (params) {
		dispatch(loginAction(params));
	}
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withStyles(styles)(Signin));