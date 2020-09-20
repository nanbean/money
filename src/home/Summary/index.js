import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';

import TableCell from '../../components/TableCell';

import Amount from '../../components/Amount';

const quickAssetAccount = [
	'키움증권맥쿼리',
	'키움증권',
	'몬쁭스SK증권',
	'동양종금장마',
	'급여계좌',
	'KB체크카드',
	'KB카드',
	'LG카드',
	'생활비카드',
	'지갑',
	'연금저축',
	'IRP',
	'IRP오은미'
];

const styles = () => ({
	root: {
		
	}
});

const getSum = accounts => accounts.map(i => i.balance).reduce((sum, i) => sum + i, 0);
const getFinanceSum = accounts => accounts.filter(i => i.type !== 'Oth A').map(i => i.balance).reduce((sum, i) => sum + i, 0);
const getQuickAssetsSum = accounts => accounts.filter(i => quickAssetAccount.find(j => j === i.name)).map(i => i.balance).reduce((sum, i) => sum + i, 0);

export function Summary ({
	accountList
}) {
	const summaryAccountList = useMemo(() => accountList.filter(i => i.closed === false && !i.name.match(/_Cash/i)), [accountList]);
	const sum = useMemo(() => getSum(summaryAccountList), [summaryAccountList]);
	const financeSum = useMemo(() => getFinanceSum(summaryAccountList), [summaryAccountList]);
	const quickAssetsSum = useMemo(() => getQuickAssetsSum(summaryAccountList), [summaryAccountList]);

	return (
		<Table>
			<TableBody>
				<TableRow>
					<TableCell align="center"><Amount value={sum} /></TableCell>
					<TableCell align="center"><Amount value={quickAssetsSum} /></TableCell>
					<TableCell align="center"><Amount value={financeSum} /></TableCell>
				</TableRow>
			</TableBody>
		</Table>
	);
}

Summary.propTypes = {
	accountList:  PropTypes.array.isRequired
};

const mapStateToProps = state => ({
	accountList: state.accountList
});

export default connect(
	mapStateToProps
)(withStyles(styles)(Summary));
