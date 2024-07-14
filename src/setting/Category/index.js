import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AutoSizer, Column, Table } from 'react-virtualized';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Input from '@mui/material/Input';
import FormControl from '@mui/material/FormControl';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import AddIcon from '@mui/icons-material/Add';

import {
	addCategoryAction,
	deleteCategoryAction,
	updateCategoryAction
} from '../../actions/couchdbActions';

export function Category () {
	const categoryList = useSelector((state) => state.settings.categoryList);
	const [selectedRow, setSelectedRow] = useState(-1);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogEdit, setDialogEdit] = useState(false);
	const [newCategoryInput, setNewCategoryInput] = useState('');
	const rows = useMemo(() => categoryList.map((i, index) => ({ id: index, category: i.key })), [categoryList]);
	const dispatch = useDispatch();

	const onRowSelect = ({ index }) => {
		const row = rows[index];

		setSelectedRow(index);
		setNewCategoryInput(row.category);
		setDialogEdit(true);
		setDialogOpen(true);
	};

	const handleAdd = () => {
		setNewCategoryInput('');
		setDialogEdit(false);
		setDialogOpen(true);
	};

	const handleDelete = () => {
		if (selectedRow >= 0) {
			dispatch(deleteCategoryAction(selectedRow));
			setSelectedRow(-1);
		}
		handleClose();
	};

	const handleClose = () => {
		setDialogOpen(false);
		setSelectedRow(-1);
	};

	const handleNewCategoryInputChange = (e) => {
		setNewCategoryInput(e.target.value);
	};

	const handleNewCategorySubmit = (e) => {
		e.preventDefault();
		if (dialogEdit) {
			dispatch(updateCategoryAction(selectedRow, newCategoryInput));
		} else {
			dispatch(addCategoryAction(newCategoryInput));
		}
		setNewCategoryInput('');
		setDialogOpen(false);
	};

	return (
		<Box
			sx={() => ({
				height:'80vh'
			})}
		>
			<Button
				fullWidth
				variant="outlined"
				color="primary"
				onClick={handleAdd}
			>
				Add
				<AddIcon
					sx={(theme) => ({
						marginLeft: theme.spacing(1)
					})}
				/>
			</Button>
			<AutoSizer>
				{({ height, width }) => (
					<Table
						headerClassName="header"
						rowClassName="row"
						width={width}
						height={height}
						headerHeight={40}
						rowHeight={40}
						rowCount={rows.length}
						rowGetter={({ index }) => rows[index]}
						onRowClick={onRowSelect}
					>
						<Column
							label="Category"
							dataKey="category"
							width={width}
							cellRenderer={({ cellData }) => cellData}
						/>
					</Table>
				)}
			</AutoSizer>
			<Dialog
				open={dialogOpen}
				onClose={handleClose}
			>
				<DialogTitle id="form-dialog-title">{dialogEdit ? 'Edit':'Add'}</DialogTitle>
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
						{
							!dialogEdit && <Button
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
						}
						{
							dialogEdit && <Button
								type="submit"
								fullWidth
								variant="contained"
								color="primary"
								sx={(theme) => ({
									marginTop: theme.spacing(1)
								})}
							>
								Edit
							</Button>
						}
						{
							dialogEdit && <Button
								fullWidth
								variant="contained"
								color="primary"
								sx={(theme) => ({
									marginTop: theme.spacing(1)
								})}
								onClick={handleDelete}
							>
								Delete
							</Button>
						}
					</form>
				</DialogContent>
			</Dialog>
		</Box>
	);
}

export default Category;
