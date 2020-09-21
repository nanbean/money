import useMediaQuery from '@material-ui/core/useMediaQuery';

const useMobile = () => {
	return useMediaQuery('(max-width: 768px)');
};

export default useMobile;