import { createMuiTheme } from '@material-ui/core/styles';

const palette = {
	primary: { main: '#3f51b5' },
	secondary: { main: '#f50057' }
};
const themeName = 'San Marino Razzmatazz Nile crocodile';
const typography = {
	useNextVariants: true
};
export default createMuiTheme({ palette, typography, themeName });