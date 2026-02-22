import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AutoSizer, Column, Table } from 'react-virtualized';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Input from '@mui/material/Input';
import FormControl from '@mui/material/FormControl';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import AddIcon from '@mui/icons-material/Add';

import {
	addCategoryAction,
	deleteCategoryAction,
	updateCategoryAction,
	updateGeneralAction
} from '../../actions/couchdbSettingActions';

export function Category () {
	const { categoryList = [], livingExpenseExempt = [] } = useSelector((state) => state.settings);
	const [selectedRow, setSelectedRow] = useState(-1);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogEdit, setDialogEdit] = useState(false);
	const [newCategoryInput, setNewCategoryInput] = useState('');
	const [exemptView, setExemptView] = useState('all');
	const rows = useMemo(() => categoryList.map((i, index) => ({ id: index, category: i })), [categoryList]);
	const dispatch = useDispatch();

	const filteredRows = useMemo(() => {
		if (exemptView === 'exempt') {
			return rows.filter(r => livingExpenseExempt.includes(r.category));
		}
		return rows;
	}, [rows, exemptView, livingExpenseExempt]);

	const onRowSelect = ({ index }) => {
		const row = filteredRows[index];

		setSelectedRow(row.id);
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

	const toggleExempt = (category) => {
		const newExempt = livingExpenseExempt.includes(category)
			? livingExpenseExempt.filter(c => c !== category)
			: [...livingExpenseExempt, category].sort();
		dispatch(updateGeneralAction('livingExpenseExempt', newExempt));
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, mt: 1 }}>
			<Stack direction="row" spacing={1} sx={{ mb: 1 }}>
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
				<ToggleButtonGroup
					value={exemptView}
					exclusive
					onChange={(_, v) => v && setExemptView(v)}
					size="small"
					sx={{ flexShrink: 0 }}
				>
					<ToggleButton value="all" sx={{ px: 1.5 }}>All</ToggleButton>
					<ToggleButton value="exempt" sx={{ px: 1.5 }}>Exempt</ToggleButton>
				</ToggleButtonGroup>
			</Stack>
			<Box sx={{ flex: 1, mt: 1 }}>
				<AutoSizer>
					{({ height, width }) => (
						<Table
							headerClassName="header"
							rowClassName="row"
							width={width}
							height={height}
							headerHeight={44}
							rowHeight={38}
							rowCount={filteredRows.length}
							rowGetter={({ index }) => filteredRows[index]}
							onRowClick={onRowSelect}
						>
							<Column
								label="Category"
								dataKey="category"
								width={width - 250}
								cellRenderer={({ cellData }) => (<Typography variant="body2">{cellData}</Typography>)}
							/>
							<Column
								label="Living Expense Exempt"
								dataKey="category"
								width={250}
								headerStyle={{ textAlign: 'center' }}
								style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
								cellRenderer={({ cellData }) => (
									<Chip
										label={livingExpenseExempt.includes(cellData) ? 'Exempt' : 'Include'}
										size="small"
										color={livingExpenseExempt.includes(cellData) ? 'default' : 'primary'}
										variant={livingExpenseExempt.includes(cellData) ? 'outlined' : 'filled'}
										onClick={(e) => { e.stopPropagation(); toggleExempt(cellData); }}
										sx={{ fontSize: 11, height: 22 }}
									/>
								)}
							/>
						</Table>
					)}
				</AutoSizer>
			</Box>
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
