import useMediaQuery from '@mui/material/useMediaQuery';

const useMobile = () => {
	return useMediaQuery('(max-width: 768px)');
};

export default useMobile;