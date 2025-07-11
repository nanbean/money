import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Stack from '@mui/material/Stack';
import SortMenuButton from '../../components/SortMenuButton';

import {
	updateGeneralAction
} from '../../actions/couchdbSettingActions';

export function ChartControls () {
	const dispatch = useDispatch();
	const { investmentHistoryRange = 'monthly', investmentHistoryType = 'quantity' } = useSelector((state) => state.settings);

	const handleTypeChange = (newType) => {
		dispatch(updateGeneralAction('investmentHistoryType', newType));
	};

	const handleRangeChange = (newRange) => {
		dispatch(updateGeneralAction('investmentHistoryRange', newRange));
	};

	return (
		<Stack spacing={2} direction="row" justifyContent="flex-end" sx={(theme) => ({
			paddingTop: theme.spacing(1),
			paddingBottom: theme.spacing(1)
		})}>
			<SortMenuButton
				value={investmentHistoryType}
				onChange={handleTypeChange}
				options={[
					{ value: 'quantity', label: 'Quantity' },
					{ value: 'amount', label: 'Amount' }
				]}
			/>
			<SortMenuButton
				value={investmentHistoryRange}
				onChange={handleRangeChange}
				options={[
					{ value: 'monthly', label: 'Monthly' },
					{ value: 'yearly', label: 'Yearly' }
				]}
			/>
		</Stack>
	);
}

export default ChartControls;