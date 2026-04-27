import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';

import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';

import useT from '../../hooks/useT';
import { sDisplay, labelStyle } from '../../utils/designTokens';
import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from '../../utils/categoryIcon';
import { CATEGORY_COLOR_OPTIONS, resolveCategoryColor } from '../../utils/categoryColor';

import {
	addCategoryAction,
	deleteCategoryAction,
	updateCategoryAction,
	updateGeneralAction,
	updateCategoryIconAction,
	updateCategoryColorAction
} from '../../actions/couchdbSettingActions';

// Hex + opacity helper (`#rrggbb` + alpha hex pair, e.g. '22' for ~13%, 'ff' = 100%)
const tint = (hex, alphaHex = '22') => `${hex}${alphaHex}`;

const fieldLabelSx = (T) => ({
	fontSize: 11,
	fontWeight: 600,
	color: T.ink2,
	marginBottom: '6px',
	display: 'block',
	textTransform: 'uppercase',
	letterSpacing: '0.04em'
});

const inputSx = (T) => ({
	width: '100%',
	padding: '10px 12px',
	fontSize: 13,
	fontFamily: 'inherit',
	background: T.bg,
	color: T.ink,
	border: `1px solid ${T.rule}`,
	borderRadius: '8px',
	outline: 'none',
	boxSizing: 'border-box',
	colorScheme: T.dark ? 'dark' : 'light',
	'&:focus': { borderColor: T.acc.hero }
});

export function Category () {
	const dispatch = useDispatch();
	const T = useT();
	const lab = labelStyle(T);

	const { categoryList = [], livingExpenseExempt = [], categoryIcons = {}, categoryColors = {} } = useSelector(
		(state) => state.settings
	);

	const [filter, setFilter] = useState('all'); // all | exempt
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isEdit, setIsEdit] = useState(false);
	const [editIndex, setEditIndex] = useState(-1);
	const [form, setForm] = useState({ name: '', icon: '', color: '', exempt: false });

	const filteredList = useMemo(() => {
		const items = categoryList.map((name, idx) => ({ idx, name }));
		if (filter === 'exempt') {
			return items.filter(i => livingExpenseExempt.includes(i.name));
		}
		return items;
	}, [categoryList, filter, livingExpenseExempt]);

	const exemptCount = useMemo(
		() => categoryList.filter(c => livingExpenseExempt.includes(c)).length,
		[categoryList, livingExpenseExempt]
	);

	const openNew = () => {
		setIsEdit(false);
		setEditIndex(-1);
		setForm({ name: '', icon: '', color: '', exempt: false });
		setDialogOpen(true);
	};

	const openEdit = (item) => {
		setIsEdit(true);
		setEditIndex(item.idx);
		// Prefill color: user-picked override > project default mapping > '' (will resolve to fallback)
		const defaultColor = categoryColors[item.name] || resolveCategoryColor(item.name);
		setForm({
			name: item.name,
			icon: categoryIcons[item.name] || '',
			color: categoryColors[item.name] || defaultColor || '',
			exempt: livingExpenseExempt.includes(item.name)
		});
		setDialogOpen(true);
	};

	const closeDialog = () => setDialogOpen(false);

	const handleSubmit = async (e) => {
		if (e) e.preventDefault();
		const trimmed = form.name.trim();
		if (!trimmed) return;

		if (isEdit) {
			const oldName = categoryList[editIndex];
			if (trimmed !== oldName) {
				dispatch(updateCategoryAction(editIndex, trimmed));
			}
			// Update exempt membership
			const wasExempt = livingExpenseExempt.includes(oldName);
			if (form.exempt !== wasExempt || trimmed !== oldName) {
				let next = livingExpenseExempt.filter(c => c !== oldName);
				if (form.exempt) next = [...next, trimmed].sort();
				dispatch(updateGeneralAction('livingExpenseExempt', next));
			}
			// Update icon (use trimmed since rename above will migrate the key)
			if ((categoryIcons[oldName] || '') !== form.icon) {
				dispatch(updateCategoryIconAction(trimmed, form.icon));
			}
			// Persist color override only when it differs from the project default mapping
			const defaultColor = resolveCategoryColor(trimmed) || '';
			const targetColor = form.color === defaultColor ? '' : form.color;
			if ((categoryColors[oldName] || '') !== targetColor) {
				dispatch(updateCategoryColorAction(trimmed, targetColor));
			}
		} else {
			dispatch(addCategoryAction(trimmed));
			if (form.exempt) {
				const next = [...livingExpenseExempt, trimmed].sort();
				dispatch(updateGeneralAction('livingExpenseExempt', next));
			}
			if (form.icon) {
				dispatch(updateCategoryIconAction(trimmed, form.icon));
			}
			const defaultColor = resolveCategoryColor(trimmed) || '';
			if (form.color && form.color !== defaultColor) {
				dispatch(updateCategoryColorAction(trimmed, form.color));
			}
		}
		closeDialog();
	};

	const handleDelete = () => {
		if (editIndex < 0) return;
		const name = categoryList[editIndex];
		dispatch(deleteCategoryAction(editIndex));
		if (livingExpenseExempt.includes(name)) {
			const next = livingExpenseExempt.filter(c => c !== name);
			dispatch(updateGeneralAction('livingExpenseExempt', next));
		}
		if (categoryIcons[name]) {
			dispatch(updateCategoryIconAction(name, null));
		}
		if (categoryColors[name]) {
			dispatch(updateCategoryColorAction(name, null));
		}
		closeDialog();
	};

	const toggleFilter = (value) => () => setFilter(value);

	const previewName = form.name || '(name)';
	const PreviewIcon = resolveCategoryIcon(form.name, form.icon);
	const previewColor = resolveCategoryColor(form.name, form.color);

	return (
		<Box>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ marginBottom: 2.25, flexWrap: 'wrap', rowGap: 1 }}>
				<Box>
					<Typography sx={{ fontSize: 13, color: T.ink3 }}>
						{categoryList.length} categories · {exemptCount} exempt
					</Typography>
				</Box>
				<Stack direction="row" spacing={1} alignItems="center">
					{/* Filter chips */}
					<Stack direction="row" spacing={0.75}>
						{[
							{ k: 'all', label: 'All' },
							{ k: 'exempt', label: 'Exempt' }
						].map(({ k, label }) => {
							const active = filter === k;
							return (
								<Box
									key={k}
									onClick={toggleFilter(k)}
									sx={{
										padding: '6px 12px',
										fontSize: 11,
										fontWeight: 600,
										borderRadius: '999px',
										background: active ? T.acc.bright : 'transparent',
										color: active ? T.acc.deep : T.ink,
										border: active ? 'none' : `1px solid ${T.rule}`,
										cursor: 'pointer',
										transition: 'all 0.15s'
									}}
								>
									{label}
								</Box>
							);
						})}
					</Stack>
					<Button
						onClick={openNew}
						startIcon={<AddIcon />}
						sx={{
							background: T.acc.bright,
							color: T.acc.deep,
							border: 'none',
							borderRadius: '999px',
							padding: '8px 16px',
							fontSize: 12,
							fontWeight: 700,
							textTransform: 'none',
							'&:hover': { background: T.acc.bright, opacity: 0.9 }
						}}
					>
						New category
					</Button>
				</Stack>
			</Stack>

			{/* Category rows */}
			<Stack spacing={0.75}>
				{filteredList.length === 0 && (
					<Box sx={{ padding: 3, textAlign: 'center', color: T.ink2, border: `1px dashed ${T.rule}`, borderRadius: '12px' }}>
						<Typography sx={{ fontSize: 13 }}>No categories</Typography>
					</Box>
				)}
				{filteredList.map(item => {
					const Icon = resolveCategoryIcon(item.name, categoryIcons[item.name]);
					const rowColor = resolveCategoryColor(item.name, categoryColors[item.name]);
					const isExempt = livingExpenseExempt.includes(item.name);
					return (
						<Box
							key={item.idx}
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '40px 1fr auto', md: '40px 1fr 90px auto' },
								gap: 1.5,
								alignItems: 'center',
								padding: '12px',
								borderRadius: '10px',
								background: T.dark ? 'rgba(255,255,255,0.02)' : T.surf2,
								border: `1px solid ${T.rule}`
							}}
						>
							<Box sx={{
								width: 40,
								height: 40,
								borderRadius: '12px',
								background: tint(rowColor, '22'),
								color: rowColor,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0
							}}>
								<Icon sx={{ fontSize: 18 }} />
							</Box>
							<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								{item.name}
							</Typography>
							<Box
								onClick={() => {
									const next = isExempt
										? livingExpenseExempt.filter(c => c !== item.name)
										: [...livingExpenseExempt, item.name].sort();
									dispatch(updateGeneralAction('livingExpenseExempt', next));
								}}
								sx={{
									display: { xs: 'none', md: 'inline-flex' },
									alignItems: 'center',
									justifyContent: 'center',
									padding: '4px 10px',
									fontSize: 11,
									fontWeight: 600,
									borderRadius: '999px',
									background: isExempt ? T.acc.bg : 'transparent',
									color: isExempt ? T.acc.deep : T.ink2,
									border: isExempt ? 'none' : `1px solid ${T.rule}`,
									cursor: 'pointer',
									transition: 'all 0.15s'
								}}
							>
								{isExempt ? 'Exempt' : 'Include'}
							</Box>
							<Button
								onClick={() => openEdit(item)}
								size="small"
								startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
								sx={{
									background: 'transparent',
									border: `1px solid ${T.rule}`,
									color: T.ink,
									borderRadius: '999px',
									padding: '4px 10px',
									fontSize: 11,
									fontWeight: 600,
									textTransform: 'none',
									minWidth: 0,
									'&:hover': { background: T.surf, borderColor: T.acc.hero, color: T.acc.hero }
								}}
							>
								Edit
							</Button>
						</Box>
					);
				})}
			</Stack>

			{/* Edit / Add Modal */}
			<Dialog
				open={dialogOpen}
				onClose={closeDialog}
				fullWidth
				maxWidth="sm"
				PaperProps={{
					sx: {
						background: T.surf,
						border: `1px solid ${T.rule}`,
						borderRadius: '20px',
						color: T.ink
					}
				}}
			>
				<Box sx={{ padding: { xs: '20px', md: '28px' } }}>
					{/* Header */}
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ marginBottom: 2.5 }}>
						<Box>
							<Typography sx={{
								fontSize: 11,
								color: T.ink3,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								fontWeight: 600
							}}>
								{isEdit ? 'Edit category' : 'New category'}
							</Typography>
							<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, marginTop: '4px', color: T.ink }}>
								{isEdit ? (categoryList[editIndex] || '') : 'Add a category'}
							</Typography>
						</Box>
						<IconButton
							onClick={closeDialog}
							size="small"
							sx={{ background: T.rule, color: T.ink2, '&:hover': { background: T.surf2 } }}
						>
							<CloseIcon sx={{ fontSize: 18 }} />
						</IconButton>
					</Stack>

					<Box component="form" onSubmit={handleSubmit}>
						{/* Name */}
						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Name</Typography>
							<Box
								component="input"
								type="text"
								value={form.name}
								onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
								placeholder="e.g. 식비"
								sx={inputSx(T)}
								autoFocus
							/>
						</Box>

						{/* Icon picker */}
						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Icon</Typography>
							<Box sx={{
								display: 'grid',
								gridTemplateColumns: { xs: 'repeat(8, 1fr)', sm: 'repeat(11, 1fr)' },
								gap: '6px',
								marginTop: '6px'
							}}>
								{CATEGORY_ICON_OPTIONS.map(({ key, Icon }) => {
									const active = form.icon === key;
									return (
										<Box
											key={key}
											onClick={() => setForm(prev => ({ ...prev, icon: active ? '' : key }))}
											sx={{
												width: '100%',
												aspectRatio: '1 / 1',
												borderRadius: '8px',
												border: `1px solid ${active ? T.acc.hero : T.rule}`,
												background: active ? T.acc.bg : 'transparent',
												color: active ? T.acc.deep : T.ink2,
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												cursor: 'pointer',
												transition: 'all 0.15s',
												'&:hover': { borderColor: T.acc.hero, color: T.acc.hero }
											}}
										>
											<Icon sx={{ fontSize: 16 }} />
										</Box>
									);
								})}
							</Box>
							<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: '8px' }}>
								Pick one — clear by clicking the selected one again. If unset, an icon is inferred from the name when a known category like 식비, 교통비, etc. is used.
							</Typography>
						</Box>

						{/* Color picker */}
						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Color</Typography>
							<Box sx={{
								display: 'grid',
								gridTemplateColumns: { xs: 'repeat(11, 1fr)', sm: 'repeat(16, 1fr)' },
								gap: '6px',
								marginTop: '6px'
							}}>
								{CATEGORY_COLOR_OPTIONS.map(c => {
									const active = (form.color || '').toLowerCase() === c.toLowerCase();
									return (
										<Box
											key={c}
											onClick={() => setForm(prev => ({ ...prev, color: active ? '' : c }))}
											sx={{
												width: '100%',
												aspectRatio: '1 / 1',
												borderRadius: '6px',
												background: c,
												cursor: 'pointer',
												boxSizing: 'border-box',
												border: active ? `2px solid ${T.ink}` : '2px solid transparent',
												outline: active ? `2px solid ${c}` : 'none',
												outlineOffset: 1,
												transition: 'transform 0.12s',
												'&:hover': { transform: 'scale(1.08)' }
											}}
										/>
									);
								})}
							</Box>
							<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: '8px' }}>
								Pick one to override the default. The first 11 swatches are project category colors; the rest are extra.
							</Typography>
						</Box>

						{/* Exempt toggle */}
						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Living-expense status</Typography>
							<Stack direction="row" spacing={0.75}>
								{[
									{ value: false, label: 'Include' },
									{ value: true, label: 'Exempt' }
								].map(({ value, label }) => {
									const active = form.exempt === value;
									return (
										<Box
											key={String(value)}
											onClick={() => setForm(prev => ({ ...prev, exempt: value }))}
											sx={{
												padding: '8px 16px',
												fontSize: 12,
												fontWeight: 600,
												borderRadius: '999px',
												background: active ? T.acc.bright : 'transparent',
												color: active ? T.acc.deep : T.ink,
												border: active ? 'none' : `1px solid ${T.rule}`,
												cursor: 'pointer',
												transition: 'all 0.15s'
											}}
										>
											{label}
										</Box>
									);
								})}
							</Stack>
						</Box>

						{/* Preview */}
						<Box sx={{
							marginTop: 2.5,
							padding: 1.75,
							borderRadius: '10px',
							border: `1px dashed ${T.rule}`
						}}>
							<Typography sx={{ ...lab, marginBottom: 1 }}>Preview</Typography>
							<Stack direction="row" alignItems="center" spacing={1.5}>
								<Box sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									background: tint(previewColor, '22'),
									color: previewColor,
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center'
								}}>
									<PreviewIcon sx={{ fontSize: 16 }} />
								</Box>
								<Box>
									<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{previewName}</Typography>
									<Typography sx={{ fontSize: 11, color: T.ink2 }}>
										{form.exempt ? 'Living-expense exempt' : 'Counted as living expense'}
									</Typography>
								</Box>
							</Stack>
						</Box>

						{/* Footer */}
						<Stack direction="row" spacing={1} sx={{ marginTop: 3, alignItems: 'center' }}>
							{isEdit && (
								<Button
									onClick={handleDelete}
									startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
									sx={{
										background: 'transparent',
										border: `1px solid ${T.neg}55`,
										color: T.neg,
										borderRadius: '999px',
										padding: '8px 14px',
										fontSize: 12,
										fontWeight: 600,
										textTransform: 'none',
										'&:hover': { background: `${T.neg}11`, borderColor: T.neg }
									}}
								>
									Delete
								</Button>
							)}
							<Box sx={{ flex: 1 }} />
							<Button
								onClick={closeDialog}
								sx={{
									background: 'transparent',
									border: `1px solid ${T.rule}`,
									color: T.ink,
									borderRadius: '999px',
									padding: '8px 16px',
									fontSize: 12,
									fontWeight: 600,
									textTransform: 'none',
									'&:hover': { background: T.surf2 }
								}}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								onClick={handleSubmit}
								sx={{
									background: T.acc.bright,
									color: T.acc.deep,
									border: 'none',
									borderRadius: '999px',
									padding: '9px 18px',
									fontSize: 12,
									fontWeight: 700,
									textTransform: 'none',
									'&:hover': { background: T.acc.bright, opacity: 0.9 }
								}}
							>
								{isEdit ? 'Save' : 'Create'}
							</Button>
						</Stack>
					</Box>
				</Box>
			</Dialog>
		</Box>
	);
}

export default Category;
