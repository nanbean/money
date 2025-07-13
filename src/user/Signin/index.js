import React from 'react';
import { useSelector } from 'react-redux';

import { Navigate } from 'react-router-dom';
import Container from '../../components/Container';
import Layout from '../../components/Layout';
import SigninForm from '../SigninForm';

export function Signin () {
	const username = useSelector((state) => state.username);

	if (username) {
		return <Navigate to="/" />;
	}

	return (
		<Layout title="Signin">
			<Container>
				<SigninForm/>
			</Container>
		</Layout>
	);
}

export default Signin;