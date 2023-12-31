import useMediaQuery from '@mui/material/useMediaQuery';

const useDarkMode = () => {
	return useMediaQuery('(prefers-color-scheme: dark)');
};

export default useDarkMode;