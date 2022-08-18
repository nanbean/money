import { styled } from '@mui/material/styles';

const Container = styled('div')(({ theme }) => ({
	flexGrow: 1,
	padding: theme.spacing(3),
	[theme.breakpoints.down('sm')]: {
		padding: 0
	}
}));

export default Container;