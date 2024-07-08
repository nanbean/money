import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DataGrid } from '@mui/x-data-grid';

import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Input from '@mui/material/Input';
import FormControl from '@mui/material/FormControl';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import {
	addCategoryAction,
	deleteCategoryAction,
	updateCategoryAction
} from '../../actions/couchdbActions';

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
	const [rowSelectionModel, setRowSelectionModel] = React.useState([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [newCategoryInput, setNewCategoryInput] = useState('');
	const dispatch = useDispatch();

	const handleProcessRowUpdate = (updatedRow) => {
		dispatch(updateCategoryAction(updatedRow.id, updatedRow.category));
		return updatedRow;
	};

	const handleAdd = () => {
		setDialogOpen(true);
	};

	const handleDelete = () => {
		if (rowSelectionModel.length > 0) {
			dispatch(deleteCategoryAction(rowSelectionModel[0]));
			setRowSelectionModel([]);
		}
	};

	const handleClose = () => {
		setDialogOpen(false);
	};

	const handleNewCategoryInputChange = (e) => {
		setNewCategoryInput(e.target.value);
	};

	const handleNewCategorySubmit = (e) => {
		e.preventDefault();
		dispatch(addCategoryAction(newCategoryInput));
		setNewCategoryInput('');
		setDialogOpen(false);
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
			<Button onClick={handleAdd}>Add</Button>
			<Button onClick={handleDelete} disabled={rowSelectionModel.length < 1}>Delete</Button>
			<DataGrid
				columns={columns}
				rows={
					categoryList.map((i, index) => ({ id: index, category: i.key }))
				}
				processRowUpdate={handleProcessRowUpdate}
				onRowSelectionModelChange={(newRowSelectionModel) => {
					setRowSelectionModel(newRowSelectionModel);
				}}
				rowSelectionModel={rowSelectionModel}
			/>
			<Dialog
				open={dialogOpen}
				onClose={handleClose}
			>
				<DialogTitle id="form-dialog-title">Add</DialogTitle>
				<DialogContent>
					<form onSubmit={handleNewCategorySubmit}>
						<FormControl required fullWidth>
							<Input
								fullWidth
								placeholder="category"
								id="category"
								value={newCategoryInput}
								onChange={handleNewCategoryInputChange}
							/>
						</FormControl>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							color="primary"
							sx={(theme) => ({
								marginTop: theme.spacing(1)
							})}
						>
							Add
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</Paper>
	);
}

export default Category;
