import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import {
	loginAction
} from '../../actions/authActions';

export function SigninForm () {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const dispatch = useDispatch();

	const handleUsernameOrEmailChange = (event) => {
		setUsername(event.target.value);
	};

	const handlePasswordChange = (event) => {
		setPassword(event.target.value);
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		// TODO add validation
		dispatch(loginAction({
			username: username,
			password: password
		}));
	};

	return (
		<div style={{ maxWidth: 520, margin: '0 auto', marginTop: 40 }}>
			<Paper
				sx={(theme) => ({
					marginTop: theme.spacing(8),
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: `${theme.spacing(2)} ${theme.spacing(3)} ${theme.spacing(3)}`
				})}
			>
				<Avatar
					sx={(theme) => ({
						margin: theme.spacing(1),
						backgroundColor: theme.palette.secondary.main
					})}
				>
					<LockOutlinedIcon />
				</Avatar>
				<Typography component="h1" variant="h5">
					Sign In
				</Typography>
				<form onSubmit={handleSubmit}>
					<FormControl margin="normal" required fullWidth>
						<InputLabel htmlFor="normal">Username</InputLabel>
						<Input
							id="username"
							name="username"
							autoComplete="signin email"
							autoFocus
							value={username}
							onChange={handleUsernameOrEmailChange}
						/>
					</FormControl>
					<FormControl margin="normal" required fullWidth>
						<InputLabel htmlFor="password">Password</InputLabel>
						<Input
							name="password"
							type="password"
							id="password"
							autoComplete="signin current-password"
							value={password}
							onChange={handlePasswordChange}
						/>
					</FormControl>
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="primary"
						sx={(theme) => ({
							marginTop: theme.spacing(3)
						})}
					>
						Sign in
					</Button>
				</form>
			</Paper>
		</div>
	);
}

export default SigninForm;