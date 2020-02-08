import { withStyles } from '@material-ui/core/styles';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';

export default withStyles({
	root: {
		border: '1px solid rgba(0,0,0,.125)',
		boxShadow: 'none',
		'&:not(:last-child)': {
			borderBottom: 0
		},
		'&:before': {
			display: 'none'
		}
	},
	expanded: {
		margin: 0
	}
})(ExpansionPanel);
