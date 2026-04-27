import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { styled } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

const Container = styled('div')(({ theme }) => ({
	position: 'fixed',
	top: 0,
	left: 0,
	right: 0,
	width: '100%',
	zIndex: theme.zIndex.drawer + 2,
	height: 3
}));

function GlobalProgress ({ loading }) {
	const transactionsFetching = useSelector((state) => state.trascationsFetching);
	const updateInvestmentPriceFetching = useSelector((state) => state.updateInvestmentPriceFetching);

	if (!loading && !transactionsFetching && !updateInvestmentPriceFetching) {
		return null;
	}
	return (
		<Container>
			<LinearProgress color="primary" sx={{ height: 3 }} />
		</Container>
	);
}

GlobalProgress.propTypes = {
	loading: PropTypes.bool
};

export default GlobalProgress;
