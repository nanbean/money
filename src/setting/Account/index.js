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
import { sDisplay, sMono, fmtCurrency, fmtCurrencyFull, labelStyle } from '../../utils/designTokens';

import { TYPE_ICON_MAP, TYPE_NAME_MAP } from '../../constants';
import {
	addAccountAction,
	editAccountAction,
	deleteAccountAction
} from '../../actions/couchdbAccountActions';

const TYPE_ORDER = ['Bank', 'CCard', 'Cash', 'Invst', 'Oth A', 'Oth L'];

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
	'&:focus': { borderColor: T.acc.hero },
	'&:disabled': { opacity: 0.5, cursor: 'not-allowed' }
});

export default function Account () {
	const dispatch = useDispatch();
	const T = useT();
	const lab = labelStyle(T);

	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions || []);
	const { exchangeRate, currency = 'KRW' } = useSelector((state) => state.settings || {});

	const [open, setOpen] = useState(false);
	const [isEdit, setIsEdit] = useState(false);
	const [formData, setFormData] = useState({
		_id: '',
		name: '',
		type: 'Bank',
		currency: 'KRW',
		closed: false
	});

	const usageMap = useMemo(() => {
		const map = new Map();
		(allAccountsTransactions || []).forEach(t => {
			const acc = t.account;
			if (!acc) return;
			map.set(acc, (map.get(acc) || 0) + 1);
		});
		return map;
	}, [allAccountsTransactions]);

	const { groups, totalAccounts, totals } = useMemo(() => {
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
		const list = (accountList || []).filter(a => !a.name.match(/_Cash/i));

		const grouped = list.reduce((acc, a) => {
			const t = a.type || 'Other';
			if (!acc[t]) acc[t] = [];
			acc[t].push(a);
			return acc;
		}, {});

		Object.values(grouped).forEach(arr => {
			arr.sort((a, b) => {
				if (!!a.closed === !!b.closed) return a.name.localeCompare(b.name);
				return a.closed ? 1 : -1;
			});
		});

		const ordered = TYPE_ORDER
			.filter(t => grouped[t])
			.map(t => [t, grouped[t]])
			.concat(
				Object.keys(grouped)
					.filter(t => !TYPE_ORDER.includes(t))
					.map(t => [t, grouped[t]])
			);

		// Net / assets / liabilities (display in current currency)
		const conv = (a) => {
			const accCur = a.currency || 'KRW';
			const bal = Number(a.balance) || 0;
			if (accCur === currency) return bal;
			if (accCur === 'KRW') return bal / validRate;
			return bal * validRate;
		};
		const net = list.reduce((s, a) => s + conv(a), 0);
		const assets = list.filter(a => Number(a.balance) > 0).reduce((s, a) => s + conv(a), 0);
		const liabilities = Math.abs(list.filter(a => Number(a.balance) < 0).reduce((s, a) => s + conv(a), 0));

		return { groups: ordered, totalAccounts: list.length, totals: { net, assets, liabilities } };
	}, [accountList, exchangeRate, currency]);

	const handleOpen = (account = null) => {
		if (account) {
			setIsEdit(true);
			setFormData({
				_id: account._id,
				name: account.name || account.account || '',
				type: account.type || 'Bank',
				currency: account.currency || 'KRW',
				closed: account.closed || false
			});
		} else {
			setIsEdit(false);
			setFormData({ _id: '', name: '', type: 'Bank', currency: 'KRW', closed: false });
		}
		setOpen(true);
	};

	const handleClose = () => setOpen(false);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		const val = type === 'checkbox' ? checked : value;
		setFormData(prev => ({ ...prev, [name]: val }));
	};

	const handleSubmit = (e) => {
		if (e) e.preventDefault();
		const newData = { ...formData, _id: `account:${formData.type}:${formData.name}` };
		if (isEdit) dispatch(editAccountAction(newData));
		else dispatch(addAccountAction(newData));
		handleClose();
	};

	const handleDelete = () => {
		dispatch(deleteAccountAction(formData));
		handleClose();
	};

	const summarySx = {
		padding: '14px',
		borderRadius: '10px',
		background: T.dark ? 'rgba(255,255,255,0.02)' : T.surf2,
		border: `1px solid ${T.rule}`
	};

	return (
		<Box>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ marginBottom: 2.25, flexWrap: 'wrap', rowGap: 1 }}>
				<Box>
					<Typography sx={{ fontSize: 13, color: T.ink3 }}>
						{totalAccounts} accounts across {groups.length} types
					</Typography>
				</Box>
				<Button
					onClick={() => handleOpen()}
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
					New account
				</Button>
			</Stack>

			{/* Summary strip */}
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: 'repeat(3, 1fr)' },
				gap: 1.5,
				marginBottom: 2.25
			}}>
				<Box sx={summarySx}>
					<Typography sx={{ fontSize: 10, color: T.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net total</Typography>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, marginTop: '4px', color: totals.net < 0 ? T.neg : T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{fmtCurrency(totals.net, currency)}
					</Typography>
				</Box>
				<Box sx={summarySx}>
					<Typography sx={{ fontSize: 10, color: T.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assets</Typography>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, marginTop: '4px', color: T.pos, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{fmtCurrency(totals.assets, currency)}
					</Typography>
				</Box>
				<Box sx={summarySx}>
					<Typography sx={{ fontSize: 10, color: T.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Liabilities</Typography>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, marginTop: '4px', color: T.neg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						−{fmtCurrency(totals.liabilities, currency)}
					</Typography>
				</Box>
			</Box>

			{/* Per-type sections */}
			{groups.map(([type, list]) => {
				const Icon = TYPE_ICON_MAP[type];
				return (
					<Box key={type} sx={{ marginBottom: 2.75 }}>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ marginBottom: 1.25 }}>
							{Icon && <Icon sx={{ fontSize: 14, color: T.ink2 }} />}
							<Typography sx={lab}>
								{TYPE_NAME_MAP[type] || type} ({list.length})
							</Typography>
						</Stack>
						<Stack spacing={0.75}>
							{list.map(a => {
								const usage = usageMap.get(a.name) || 0;
								const balance = Number(a.balance) || 0;
								const isLiab = balance < 0;
								return (
									<Box
										key={a._id || a.name}
										sx={{
											display: 'grid',
											gridTemplateColumns: { xs: '40px 1fr auto', md: '40px 1fr 1fr 90px auto' },
											gap: 1.5,
											alignItems: 'center',
											padding: '12px',
											borderRadius: '10px',
											background: T.dark ? 'rgba(255,255,255,0.02)' : T.surf2,
											border: `1px solid ${T.rule}`,
											opacity: a.closed ? 0.55 : 1
										}}
									>
										<Box sx={{
											width: 40,
											height: 40,
											borderRadius: '12px',
											background: T.acc.bg,
											color: T.acc.deep,
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0
										}}>
											{Icon && <Icon sx={{ fontSize: 18 }} />}
										</Box>
										<Box sx={{ minWidth: 0 }}>
											<Typography sx={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.ink }}>
												{a.name}{a.closed && <Box component="span" sx={{ color: T.ink3, fontWeight: 400, marginLeft: '6px' }}>(closed)</Box>}
											</Typography>
											<Typography sx={{ fontSize: 11, color: T.ink2 }}>
												{a.currency || 'KRW'}
											</Typography>
										</Box>
										<Typography sx={{
											...sMono,
											fontSize: 13,
											fontWeight: 600,
											color: isLiab ? T.neg : T.ink,
											whiteSpace: 'nowrap',
											display: { xs: 'none', md: 'block' }
										}}>
											{fmtCurrencyFull(balance, a.currency || 'KRW')}
										</Typography>
										<Typography sx={{
											fontSize: 11,
											color: T.ink3,
											textAlign: 'right',
											display: { xs: 'none', md: 'block' }
										}}>
											{usage} txn{usage !== 1 ? 's' : ''}
										</Typography>
										<Stack direction="row" spacing={0.75}>
											<Button
												onClick={() => handleOpen(a)}
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
										</Stack>
									</Box>
								);
							})}
						</Stack>
					</Box>
				);
			})}

			{/* Edit / Add Modal — design-aligned with chip selectors */}
			<Dialog
				open={open}
				onClose={handleClose}
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
								{isEdit ? 'Edit account' : 'New account'}
							</Typography>
							<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, marginTop: '4px', color: T.ink }}>
								{isEdit ? formData.name : 'Add an account'}
							</Typography>
						</Box>
						<IconButton
							onClick={handleClose}
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
								name="name"
								type="text"
								value={formData.name}
								onChange={handleChange}
								disabled={isEdit}
								placeholder="e.g. Main checking"
								sx={inputSx(T)}
								autoFocus
							/>
						</Box>

						{/* Type — chip selector */}
						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Type</Typography>
							<Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
								{TYPE_ORDER.map(typeKey => {
									const TypeIcon = TYPE_ICON_MAP[typeKey];
									const active = formData.type === typeKey;
									return (
										<Box
											key={typeKey}
											onClick={() => !isEdit && setFormData(prev => ({ ...prev, type: typeKey }))}
											sx={{
												padding: '8px 14px',
												fontSize: 12,
												fontWeight: 600,
												borderRadius: '999px',
												background: active ? T.acc.bright : 'transparent',
												color: active ? T.acc.deep : T.ink,
												border: active ? 'none' : `1px solid ${T.rule}`,
												cursor: isEdit ? 'not-allowed' : 'pointer',
												opacity: isEdit && !active ? 0.5 : 1,
												display: 'inline-flex',
												alignItems: 'center',
												gap: 0.75,
												whiteSpace: 'nowrap',
												transition: 'all 0.15s'
											}}
										>
											{TypeIcon && <TypeIcon sx={{ fontSize: 12 }} />}
											{TYPE_NAME_MAP[typeKey] || typeKey}
										</Box>
									);
								})}
							</Stack>
						</Box>

						{/* Currency + Closed */}
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
							gap: 2,
							marginBottom: 2
						}}>
							<Box>
								<Typography sx={fieldLabelSx(T)}>Currency</Typography>
								<Stack direction="row" spacing={0.75}>
									{['KRW', 'USD'].map(c => {
										const active = formData.currency === c;
										return (
											<Box
												key={c}
												onClick={() => setFormData(prev => ({ ...prev, currency: c }))}
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
												{c}
											</Box>
										);
									})}
								</Stack>
							</Box>
							<Box>
								<Typography sx={fieldLabelSx(T)}>Status</Typography>
								<Stack direction="row" spacing={0.75}>
									{[
										{ value: false, label: 'Active' },
										{ value: true, label: 'Closed' }
									].map(({ value, label }) => {
										const active = !!formData.closed === value;
										return (
											<Box
												key={String(value)}
												onClick={() => setFormData(prev => ({ ...prev, closed: value }))}
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
								onClick={handleClose}
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
