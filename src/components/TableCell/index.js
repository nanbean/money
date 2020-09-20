import { withStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';

export default withStyles((theme) => ({
	root: {
		[theme.breakpoints.down('sm')]: {
			fontSize: '0.8rem',
			padding: theme.spacing(1)
		}
	}
}))(TableCell);