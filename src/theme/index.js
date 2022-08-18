import { red } from '@mui/material/colors';
import { createTheme } from '@mui/material/styles';

const palette = {
	primary: {
		main: '#3f51b5'
	},
	secondary: {
		main: '#f50057'
	},
	error: {
		main: red.A400
	}
};
const themeName = 'San Marino Razzmatazz Nile crocodile';

const typography = {
	useNextVariants: true
};

const components = {
	MuiAppBar: {
		styleOverrides: {
			root: ({ theme }) => ({
				flexGrow: 1,
				zIndex: theme.zIndex.drawer + 1,
				transition: theme.transitions.create(['margin', 'width'], {
					easing: theme.transitions.easing.sharp,
					duration: theme.transitions.duration.leavingScreen
				})
			})
		}
	},
	MuiTableRow: {
		styleOverrides: {
			root: {
				'&:hover': {
					cursor: 'pointer'
				}
			}
		}
	},
	MuiTableCell: {
		styleOverrides: {
			root: ({ theme }) => ({
				[theme.breakpoints.down('sm')]: {
					fontSize: '0.8rem',
					padding: theme.spacing(1)
				}
			})
		}
	},
	MuiCheckbox: {
		styleOverrides: {
			root: ({ theme }) => ({
				padding: theme.spacing(0.5)
			})
		}
	},
	MuiTextField: {
		styleOverrides: {
			root: ({ theme }) => ({
				paddingBottom: theme.spacing(0.5),
				fontSize: '0.8rem'
			})
		}
	},
	MuiAutocomplete: {
		styleOverrides: {
			listbox: {
				margin: 0
			}
		}
	}
};

export default createTheme({ palette, typography, components, themeName });