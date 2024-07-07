import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Paper from '@mui/material/Paper';
import { DataGrid } from '@mui/x-data-grid';

import { updateCategoryAction } from '../../actions/couchdbActions';

const columns = [
	{ field: 'id', headerName: 'ID', width: 90 },
	{
		field: 'category',
		headerName: 'Category',
		width: 250,
		editable: true
	}
];

export function Category () {
	const categoryList = useSelector((state) => state.settings.categoryList);
	const dispatch = useDispatch();

	const handleProcessRowUpdate = (updatedRow) => {
		dispatch(updateCategoryAction(updatedRow.id, updatedRow.category));
		return updatedRow;
	};

	return (
		<Paper
			sx={(theme) => ({
				[theme.breakpoints.up('lg')]: {
					marginTop: theme.spacing(2)
				},
				[theme.breakpoints.down('sm')]: {
					marginTop: 0
				},
				alignItems: 'center'
			})}
		>
			<DataGrid
				columns={columns}
				rows={
					categoryList.map((i, index) => ({ id: index, category: i.key }))
				}
				processRowUpdate={handleProcessRowUpdate}
			/>
		</Paper>
	);
}

export default Category;
