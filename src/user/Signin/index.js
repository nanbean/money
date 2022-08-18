import React from 'react';
import { useSelector } from 'react-redux';

import { Navigate } from 'react-router-dom';

import TitleHeader from '../../components/TitleHeader';
import Container from '../../components/Container';

import SigninForm from '../SigninForm';

export function Signin () {
	const username = useSelector((state) => state.username);

	if (username) {
		return <Navigate to="/" />;
	}

	return (
		<React.Fragment>
			<TitleHeader title="Home" />
			<Container>
				<SigninForm/>
			</Container>
		</React.Fragment>
	);
}

export default Signin;