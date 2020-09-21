import React, { Component } from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';

const styles = theme => ({
	root: {
		maxWidth: 520,
		margin: '0 auto',
		marginTop: 40
	},
	paper: {
		marginTop: theme.spacing(8),
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		padding: `${theme.spacing(2)}px ${theme.spacing(3)}px ${theme.spacing(3)}px`
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.secondary.main
	},
	form: {
		width: '100%', // Fix IE 11 issue.
		marginTop: theme.spacing(1)
	},
	submit: {
		marginTop: theme.spacing(3)
	}
});

export class SigninForm extends Component {
	state = {
		username: '',
		password: ''
	};

	handleUsernameOrEmailChange = (event) => {
		this.setState({ username: event.target.value });
	}

	handlePasswordChange = (event) => {
		this.setState({ password: event.target.value });
	}

	handleSubmit = (event) => {
		event.preventDefault();
		// TODO add validation
		this.props.loginAction({
			username: this.state.username,
			password: this.state.password
		});
	}

	render () {
		const { classes } = this.props;

		return (
			<div className={classes.root}>
				<Paper className={classes.paper}>
					<Avatar className={classes.avatar}>
						<LockOutlinedIcon />
					</Avatar>
					<Typography component="h1" variant="h5">
						Sign In
					</Typography>
					<form className={classes.form} onSubmit={this.handleSubmit}>
						<FormControl margin="normal" required fullWidth>
							<InputLabel htmlFor="normal">Username</InputLabel>
							<Input
								id="username"
								name="username"
								autoComplete="signin email"
								autoFocus
								value={this.state.username}
								onChange={this.handleUsernameOrEmailChange}
							/>
						</FormControl>
						<FormControl margin="normal" required fullWidth>
							<InputLabel htmlFor="password">Password</InputLabel>
							<Input
								name="password"
								type="password"
								id="password"
								autoComplete="signin current-password"
								value={this.state.password}
								onChange={this.handlePasswordChange}
							/>
						</FormControl>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
							className={classes.submit}
						>
							Sign in
						</Button>
					</form>
				</Paper>
			</div>
		);
	}
}

SigninForm.propTypes = {
	classes: PropTypes.object.isRequired,
	loginAction: PropTypes.func.isRequired
};

export default withStyles(styles)(SigninForm);