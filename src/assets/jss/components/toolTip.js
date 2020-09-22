import { defaultFont } from '../root.js';

const toolTip = {
	root: {
		padding: '5px',
		border: '1px solid rgba(34,36,38,.1)',
		borderRadius: '.28571429rem',
		backgroundColor: 'white'
	},
	label: {
		...defaultFont,
		fontWeight: '500',
		fontSize: '1.1em',
		width: '100%'
	},
	item: {
		...defaultFont,
		fontWeight: '400',
		width: '100%'
	}
};

export default toolTip;