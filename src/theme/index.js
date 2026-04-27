import { createTheme } from '@mui/material/styles';

const DARK = {
	bg: '#0a0a0f',
	surf: '#15151c',
	surf2: '#1d1d26',
	ink: '#f5f5f8',
	ink2: '#9999a8',
	ink3: '#5a5a68',
	rule: '#26262f'
};

const LIGHT = {
	bg: '#fafaf7',
	surf: '#ffffff',
	surf2: '#f5f5f0',
	ink: '#1a1a1f',
	ink2: '#6b6b75',
	ink3: '#a8a8b0',
	rule: '#e8e8e3'
};

const ACC_INDIGO = {
	hero: '#4338ca',
	bright: '#818cf8',
	tint: 'rgba(67,56,202,0.12)'
};

const FAMILIES = {
	display: '"Space Grotesk","Pretendard",-apple-system,system-ui,sans-serif',
	mono: '"JetBrains Mono","Roboto Mono",ui-monospace,monospace',
	body: '"Manrope","Pretendard",-apple-system,system-ui,sans-serif'
};

function theme ({ prefersDarkMode }) {
	const t = prefersDarkMode ? DARK : LIGHT;

	const palette = {
		mode: prefersDarkMode ? 'dark' : 'light',
		primary: { main: ACC_INDIGO.hero, light: ACC_INDIGO.bright },
		secondary: { main: ACC_INDIGO.bright },
		error: { main: '#f87171' },
		success: { main: '#4ade80' },
		warning: { main: '#fbbf24' },
		background: {
			default: t.bg,
			paper: t.surf
		},
		text: {
			primary: t.ink,
			secondary: t.ink2,
			disabled: t.ink3
		},
		divider: t.rule
	};

	const typography = {
		fontFamily: FAMILIES.body,
		h1: { fontFamily: FAMILIES.display, letterSpacing: '-0.02em', fontWeight: 700 },
		h2: { fontFamily: FAMILIES.display, letterSpacing: '-0.02em', fontWeight: 700 },
		h3: { fontFamily: FAMILIES.display, letterSpacing: '-0.02em', fontWeight: 700 },
		h4: { fontFamily: FAMILIES.display, letterSpacing: '-0.02em', fontWeight: 700 },
		h5: { fontFamily: FAMILIES.display, letterSpacing: '-0.02em', fontWeight: 700 },
		h6: { fontFamily: FAMILIES.display, letterSpacing: '-0.01em', fontWeight: 700 },
		subtitle1: { fontFamily: FAMILIES.body, fontWeight: 600 },
		subtitle2: { fontFamily: FAMILIES.body, fontWeight: 600 },
		body1: { fontFamily: FAMILIES.body },
		body2: { fontFamily: FAMILIES.body },
		button: { fontFamily: FAMILIES.body, fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
		overline: { fontFamily: FAMILIES.body, letterSpacing: '0.06em', fontWeight: 600 }
	};

	const components = {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					backgroundColor: t.bg,
					color: t.ink,
					fontFamily: FAMILIES.body
				}
			}
		},
		MuiAppBar: {
			styleOverrides: {
				root: ({ theme: th }) => ({
					backgroundColor: t.surf,
					backgroundImage: 'none',
					color: t.ink,
					borderBottom: `1px solid ${t.rule}`,
					boxShadow: 'none',
					flexGrow: 1,
					zIndex: th.zIndex.drawer + 1
				})
			}
		},
		MuiDrawer: {
			styleOverrides: {
				paper: {
					backgroundColor: t.surf,
					backgroundImage: 'none',
					borderRight: `1px solid ${t.rule}`,
					color: t.ink
				}
			}
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: 'none',
					backgroundColor: t.surf,
					color: t.ink
				}
			}
		},
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: 'none',
					backgroundColor: t.surf,
					borderRadius: 16,
					border: `1px solid ${t.rule}`,
					boxShadow: 'none'
				}
			}
		},
		MuiTableRow: {
			styleOverrides: {
				root: {
					'&:hover': { cursor: 'pointer', backgroundColor: t.surf2 }
				}
			}
		},
		MuiTableCell: {
			styleOverrides: {
				root: ({ theme: th }) => ({
					borderBottom: `1px solid ${t.rule}`,
					color: t.ink,
					[th.breakpoints.down('sm')]: {
						fontSize: '0.8rem',
						padding: th.spacing(1)
					}
				}),
				head: {
					color: t.ink2,
					fontWeight: 600,
					textTransform: 'uppercase',
					fontSize: 11,
					letterSpacing: '0.04em',
					backgroundColor: t.surf
				}
			}
		},
		MuiCheckbox: {
			styleOverrides: {
				root: ({ theme: th }) => ({ padding: th.spacing(0.5) })
			}
		},
		MuiTextField: {
			styleOverrides: {
				root: ({ theme: th }) => ({ paddingBottom: th.spacing(0.5), fontSize: '0.8rem' })
			}
		},
		MuiAutocomplete: {
			styleOverrides: { listbox: { margin: 0 } }
		},
		MuiTabs: {
			styleOverrides: {
				root: { borderBottom: `1px solid ${t.rule}`, minHeight: 40 },
				indicator: { backgroundColor: ACC_INDIGO.bright, height: 2 }
			}
		},
		MuiTab: {
			styleOverrides: {
				root: {
					textTransform: 'none',
					fontWeight: 600,
					fontSize: 13,
					minHeight: 40,
					color: t.ink2,
					'&.Mui-selected': { color: t.ink }
				}
			}
		},
		MuiChip: {
			styleOverrides: {
				root: {
					fontFamily: FAMILIES.body,
					fontWeight: 600,
					borderRadius: 999
				},
				outlined: { borderColor: t.rule }
			}
		},
		MuiToggleButton: {
			styleOverrides: {
				root: {
					textTransform: 'none',
					fontWeight: 600,
					color: t.ink2,
					borderColor: t.rule,
					'&.Mui-selected': { color: t.ink, backgroundColor: t.surf2 }
				}
			}
		},
		MuiButton: {
			styleOverrides: { root: { borderRadius: 10, fontWeight: 600 } }
		},
		MuiDivider: {
			styleOverrides: { root: { borderColor: t.rule } }
		}
	};

	return createTheme({
		palette,
		typography,
		components,
		shape: { borderRadius: 12 },
		themeName: 'money-redesign'
	});
}

export default theme;
