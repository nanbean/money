import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RepeatIcon from '@mui/icons-material/Repeat';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../../utils/designTokens';
import { resolveCategoryIcon } from '../../utils/categoryIcon';
import { resolveCategoryColor } from '../../utils/categoryColor';

import {
	addPaymentAction,
	editPaymentAction,
	deletePaymentAction
} from '../../actions/couchdbSettingActions';

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
	'&:focus': { borderColor: T.acc.hero }
});

const INTERVAL_LABEL = (n) => {
	if (n === 1) return { en: 'Monthly', ko: '월간' };
	if (n === 2) return { en: 'Bimonthly', ko: '격월' };
	if (n === 3) return { en: 'Quarterly', ko: '분기' };
	if (n === 6) return { en: 'Semi-annual', ko: '반기' };
	if (n === 12) return { en: 'Yearly', ko: '연간' };
	return { en: `Every ${n} mo.`, ko: `${n}개월마다` };
};

const INTERVAL_ORDER = [1, 2, 3, 6, 12];

function nextDueDate (day, interval) {
	const now = moment();
	let candidate = moment().date(day);
	if (candidate.isBefore(now, 'day')) {
		candidate = candidate.add(interval || 1, 'months');
	}
	return candidate;
}

const emptyForm = {
	payee: '',
	accountId: '',
	account: '',
	amount: 0,
	currency: 'KRW',
	day: 1,
	interval: 1,
	category: '',
	subcategory: '',
	memo: '',
	valid: true
};

export default function PaymentList () {
	const T = useT();
	const dispatch = useDispatch();

	const { paymentList = [], categoryList = [], currency: appCurrency = 'KRW', exchangeRate } = useSelector((state) => state.settings || {});
	const accountList = useSelector((state) => state.accountList);

	const [filter, setFilter] = useState('active'); // active | inactive | all
	const [open, setOpen] = useState(false);
	const [editIndex, setEditIndex] = useState(-1);
	const [formData, setFormData] = useState(emptyForm);

	const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;

	const enriched = useMemo(() => paymentList.map((p, idx) => {
		const acct = accountList.find(a => a._id === p.accountId);
		const interval = Number(p.interval) || 1;
		const monthly = (Number(p.amount) || 0) / interval;
		const monthlyKrw = (p.currency === 'USD' ? monthly * validRate : monthly);
		return {
			...p,
			originalIndex: idx,
			interval,
			accountName: (acct && acct.name) || p.account,
			monthlyKrw,
			due: nextDueDate(Number(p.day) || 1, interval)
		};
	}), [paymentList, accountList, validRate]);

	const filtered = useMemo(() => enriched.filter(p => {
		if (filter === 'active') return !!p.valid;
		if (filter === 'inactive') return !p.valid;
		return true;
	}), [enriched, filter]);

	const totalMonthlyKrw = useMemo(() => enriched
		.filter(p => p.valid)
		.reduce((s, p) => s + p.monthlyKrw, 0), [enriched]);

	const upcoming = useMemo(() => enriched
		.filter(p => p.valid)
		.sort((a, b) => a.due.diff(b.due))
		.slice(0, 3), [enriched]);

	const counts = useMemo(() => ({
		active: enriched.filter(p => p.valid).length,
		inactive: enriched.filter(p => !p.valid).length,
		all: enriched.length
	}), [enriched]);

	const grouped = useMemo(() => {
		const map = new Map();
		filtered.forEach(p => {
			const key = INTERVAL_ORDER.includes(p.interval) ? p.interval : 'custom';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(p);
		});
		const ordered = [];
		INTERVAL_ORDER.forEach(k => { if (map.has(k)) ordered.push([k, map.get(k)]); });
		if (map.has('custom')) ordered.push(['custom', map.get('custom')]);
		return ordered;
	}, [filtered]);

	const handleOpen = (originalIndex = -1) => {
		if (originalIndex >= 0) {
			setEditIndex(originalIndex);
			setFormData({ ...emptyForm, ...paymentList[originalIndex] });
		} else {
			setEditIndex(-1);
			setFormData(emptyForm);
		}
		setOpen(true);
	};

	const handleClose = () => setOpen(false);

	const handleAccountChange = (accountId) => {
		const account = accountList.find(a => a._id === accountId);
		setFormData(prev => ({
			...prev,
			accountId,
			account: account ? account.name : '',
			currency: account ? account.currency : prev.currency
		}));
	};

	const handleCategoryChange = (val) => {
		const [cat, sub] = (val || '').split(':');
		setFormData(prev => ({ ...prev, category: cat || '', subcategory: sub || '' }));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const data = {
			...formData,
			amount: Number(formData.amount),
			day: Number(formData.day),
			interval: Number(formData.interval) || 1
		};
		if (editIndex >= 0) {
			dispatch(editPaymentAction(editIndex, data));
		} else {
			dispatch(addPaymentAction(data));
		}
		handleClose();
	};

	const handleDelete = () => {
		if (editIndex >= 0) {
			dispatch(deletePaymentAction(editIndex));
		}
		handleClose();
	};

	const handleToggleValid = (originalIndex) => {
		const item = paymentList[originalIndex];
		dispatch(editPaymentAction(originalIndex, { ...item, valid: !item.valid }));
	};

	const isEdit = editIndex >= 0;
	const accountOptions = (accountList || [])
		.filter(a => !a.closed && (a.type === 'Bank' || a.type === 'CCard' || a.type === 'Cash' || a.type === 'Oth L'));

	const renderRow = (p) => {
		const Icon = resolveCategoryIcon(p.category);
		const dotColor = resolveCategoryColor(p.category);
		const days = p.due.diff(moment().startOf('day'), 'days');
		const dueWarn = p.valid && days >= 0 && days <= 7;

		return (
			<Box key={p.originalIndex} sx={{
				display: 'grid',
				gridTemplateColumns: { xs: '40px 1fr auto', md: '40px 1.5fr 1fr 110px 130px auto' },
				gap: 1.5,
				alignItems: 'center',
				padding: '12px',
				borderRadius: '10px',
				background: T.dark ? 'rgba(255,255,255,0.02)' : '#fafaf6',
				border: `1px solid ${T.rule}`,
				marginBottom: '6px',
				opacity: p.valid ? 1 : 0.5
			}}>
				<Box sx={{
					width: 40,
					height: 40,
					borderRadius: '12px',
					background: dotColor,
					color: '#fff',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					filter: p.valid ? 'none' : 'grayscale(0.7)'
				}}>
					<Icon sx={{ fontSize: 18 }} />
				</Box>

				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{
						fontSize: 13,
						fontWeight: 600,
						color: T.ink,
						display: 'flex',
						alignItems: 'center',
						gap: 0.75
					}}>
						<Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
							{p.payee || '(no payee)'}
						</Box>
						{!p.valid && (
							<Box component="span" sx={{
								fontSize: 9,
								padding: '1px 6px',
								borderRadius: '4px',
								background: '#fbbf2433',
								color: '#a16207',
								fontWeight: 700,
								textTransform: 'uppercase',
								flexShrink: 0
							}}>Paused</Box>
						)}
					</Typography>
					<Typography sx={{ fontSize: 11, color: T.ink2, marginTop: '2px' }}>
						{p.accountName || '—'}
						{p.category ? ` · ${p.category}${p.subcategory ? ':' + p.subcategory : ''}` : ''}
					</Typography>
				</Box>

				<Box sx={{ display: { xs: 'none', md: 'block' } }}>
					<Typography sx={{
						fontSize: 11,
						fontWeight: 600,
						color: dueWarn ? '#f59e0b' : T.ink2,
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.5
					}}>
						<EventOutlinedIcon sx={{ fontSize: 12 }} />
						{p.due.format('YYYY-MM-DD')}
					</Typography>
					<Typography sx={{ fontSize: 10, color: T.ink3, marginTop: '2px' }}>
						{days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `in ${days}d`}
					</Typography>
				</Box>

				<Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
					<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap' }}>
						{fmtCurrency(p.amount, p.currency)}
					</Typography>
					<Typography sx={{ fontSize: 10, color: T.ink3, marginTop: '2px' }}>
						day {p.day} · {INTERVAL_LABEL(p.interval).en.toLowerCase()}
					</Typography>
				</Box>

				<Stack direction="row" spacing={0.5} justifyContent="flex-end">
					<IconButton
						size="small"
						onClick={() => handleToggleValid(p.originalIndex)}
						sx={{ color: T.ink2, '&:hover': { color: T.acc.hero, background: T.surf2 } }}
						title={p.valid ? 'Pause' : 'Resume'}
					>
						{p.valid ? <PauseCircleOutlineIcon sx={{ fontSize: 16 }} /> : <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />}
					</IconButton>
					<IconButton
						size="small"
						onClick={() => handleOpen(p.originalIndex)}
						sx={{ color: T.ink2, '&:hover': { color: T.acc.hero, background: T.surf2 } }}
						title="Edit"
					>
						<EditOutlinedIcon sx={{ fontSize: 16 }} />
					</IconButton>
				</Stack>
			</Box>
		);
	};

	return (
		<Stack spacing={2}>
			{/* Hero */}
			<Box sx={{
				background: T.dark
					? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
					: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`,
				color: '#fff',
				borderRadius: '20px',
				padding: { xs: '20px', md: '28px' },
				position: 'relative',
				overflow: 'hidden'
			}}>
				<Box sx={{
					position: 'absolute',
					top: -40,
					right: -40,
					width: 200,
					height: 200,
					borderRadius: '50%',
					background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
					pointerEvents: 'none'
				}} />
				<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={2} sx={{ position: 'relative' }}>
					<Box>
						<Typography sx={{
							fontSize: 11,
							color: 'rgba(255,255,255,0.7)',
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							fontWeight: 600
						}}>
							Recurring payments · 정기 지불
						</Typography>
						<Typography sx={{ ...sDisplay, fontSize: { xs: 28, md: 36 }, fontWeight: 700, marginTop: '8px', lineHeight: 1.05 }}>
							{fmtCurrency(totalMonthlyKrw, appCurrency)}
							<Box component="span" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, fontSize: 14, marginLeft: '8px' }}>
								/ month
							</Box>
						</Typography>
						<Stack direction="row" spacing={1.5} sx={{ marginTop: '10px', fontSize: 12, color: 'rgba(255,255,255,0.7)', flexWrap: 'wrap' }}>
							<span>≈ {fmtCurrency(totalMonthlyKrw * 12, appCurrency)} / year</span>
							<span>·</span>
							<span>{counts.active} active</span>
							<span>·</span>
							<span>{counts.inactive} paused</span>
						</Stack>
					</Box>
					<Box
						component="button"
						onClick={() => handleOpen()}
						sx={{
							background: T.acc.bright,
							color: T.acc.deep,
							border: 'none',
							borderRadius: '999px',
							padding: '10px 18px',
							fontSize: 12,
							fontWeight: 700,
							fontFamily: 'inherit',
							cursor: 'pointer',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							flexShrink: 0,
							'&:hover': { opacity: 0.9 }
						}}
					>
						<AddIcon sx={{ fontSize: 14 }} /> Add recurring payment
					</Box>
				</Stack>

				{upcoming.length > 0 && (
					<Box sx={{
						marginTop: '22px',
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
						gap: '10px',
						position: 'relative'
					}}>
						{upcoming.map(p => {
							const Icon = resolveCategoryIcon(p.category);
							const days = p.due.diff(moment().startOf('day'), 'days');
							return (
								<Box key={p.originalIndex} sx={{
									background: 'rgba(255,255,255,0.08)',
									border: '1px solid rgba(255,255,255,0.12)',
									borderRadius: '12px',
									padding: '12px',
									display: 'flex',
									alignItems: 'center',
									gap: '10px'
								}}>
									<Box sx={{
										width: 32,
										height: 32,
										borderRadius: '8px',
										background: resolveCategoryColor(p.category),
										color: '#fff',
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0
									}}>
										<Icon sx={{ fontSize: 14 }} />
									</Box>
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
											{p.payee || '(no payee)'}
										</Typography>
										<Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
											{days <= 0 ? 'today' : `in ${days}d`} · {fmtCurrency(p.amount, p.currency)}
										</Typography>
									</Box>
								</Box>
							);
						})}
					</Box>
				)}
			</Box>

			{/* List */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '16px', md: '20px' },
				color: T.ink
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 2, flexWrap: 'wrap', gap: 1 }}>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0, whiteSpace: 'nowrap' }}>
						All payments
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 14, marginLeft: '6px' }}>· {filtered.length}건</Box>
					</Typography>
					<Stack direction="row" spacing={0.75}>
						{[
							{ k: 'active',   label: 'Active',   ko: '진행중' },
							{ k: 'inactive', label: 'Paused',   ko: '일시중지' },
							{ k: 'all',      label: 'All',      ko: '전체' }
						].map(({ k, label, ko }) => {
							const active = filter === k;
							return (
								<Box
									key={k}
									onClick={() => setFilter(k)}
									sx={{
										padding: '6px 12px',
										fontSize: 11,
										fontWeight: 600,
										borderRadius: '999px',
										background: active ? T.acc.bright : 'transparent',
										color: active ? T.acc.deep : T.ink,
										border: active ? 'none' : `1px solid ${T.rule}`,
										cursor: 'pointer',
										whiteSpace: 'nowrap',
										transition: 'all 0.15s'
									}}
								>
									{label} · {ko}
								</Box>
							);
						})}
					</Stack>
				</Stack>

				{grouped.length === 0 && (
					<Box sx={{ padding: '40px 0', textAlign: 'center', color: T.ink2 }}>
						<RepeatIcon sx={{ fontSize: 28, color: T.ink3 }} />
						<Typography sx={{ marginTop: '12px', fontSize: 14, fontWeight: 600, color: T.ink }}>
							No payments in this view
						</Typography>
					</Box>
				)}

				{grouped.map(([key, list]) => {
					const lab = key === 'custom'
						? { en: 'Custom', ko: '기타' }
						: INTERVAL_LABEL(key);
					const subtotal = list
						.filter(p => p.valid)
						.reduce((s, p) => s + p.monthlyKrw, 0);
					return (
						<Box key={key} sx={{ marginBottom: '22px' }}>
							<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: '10px' }}>
								<Typography sx={{
									fontSize: 11,
									fontWeight: 600,
									color: T.ink2,
									textTransform: 'uppercase',
									letterSpacing: '0.04em'
								}}>
									{lab.en} · {lab.ko} ({list.length})
								</Typography>
								<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3 }}>
									{fmtCurrency(subtotal, appCurrency)}/mo
								</Typography>
							</Stack>
							{list.map(renderRow)}
						</Box>
					);
				})}
			</Box>

			{/* Modal */}
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
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ marginBottom: 2.5 }}>
						<Box>
							<Typography sx={{
								fontSize: 11,
								color: T.ink3,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								fontWeight: 600
							}}>
								{isEdit ? 'Edit payment' : 'New payment'}
							</Typography>
							<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, marginTop: '4px', color: T.ink }}>
								{isEdit ? (formData.payee || 'Payment') : 'Add a recurring payment'}
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
						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Payee</Typography>
							<Box
								component="input"
								type="text"
								value={formData.payee}
								onChange={e => setFormData(prev => ({ ...prev, payee: e.target.value }))}
								placeholder="e.g. Netflix"
								sx={inputSx(T)}
								required
								autoFocus
							/>
						</Box>

						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Account</Typography>
							<Box
								component="select"
								value={formData.accountId}
								onChange={e => handleAccountChange(e.target.value)}
								sx={inputSx(T)}
								required
							>
								<option value="">Select account</option>
								{accountOptions.map(a => (
									<option key={a._id} value={a._id}>{a.name}</option>
								))}
							</Box>
						</Box>

						<Box sx={{
							display: 'grid',
							gridTemplateColumns: { xs: '1fr', sm: '1fr 110px' },
							gap: 1.5,
							marginBottom: 2
						}}>
							<Box>
								<Typography sx={fieldLabelSx(T)}>Amount</Typography>
								<Box
									component="input"
									type="number"
									value={formData.amount}
									onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
									sx={inputSx(T)}
									required
								/>
							</Box>
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
													flex: 1,
													padding: '10px 0',
													fontSize: 12,
													fontWeight: 600,
													textAlign: 'center',
													borderRadius: '8px',
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
						</Box>

						<Box sx={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 1.5,
							marginBottom: 2
						}}>
							<Box>
								<Typography sx={fieldLabelSx(T)}>Day of month</Typography>
								<Box
									component="input"
									type="number"
									min={1}
									max={31}
									value={formData.day}
									onChange={e => setFormData(prev => ({ ...prev, day: e.target.value }))}
									sx={inputSx(T)}
									required
								/>
							</Box>
							<Box>
								<Typography sx={fieldLabelSx(T)}>Interval (months)</Typography>
								<Box
									component="input"
									type="number"
									min={1}
									max={12}
									value={formData.interval ?? 1}
									onChange={e => setFormData(prev => ({ ...prev, interval: e.target.value }))}
									sx={inputSx(T)}
								/>
							</Box>
						</Box>

						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Category</Typography>
							<Box
								component="select"
								value={formData.category + (formData.subcategory ? ':' + formData.subcategory : '')}
								onChange={e => handleCategoryChange(e.target.value)}
								sx={inputSx(T)}
							>
								<option value="">Uncategorized</option>
								{categoryList.map(c => (
									<option key={c} value={c}>{c}</option>
								))}
							</Box>
						</Box>

						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Memo</Typography>
							<Box
								component="input"
								type="text"
								value={formData.memo}
								onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
								placeholder="Optional note"
								sx={inputSx(T)}
							/>
						</Box>

						<Box sx={{ marginBottom: 2 }}>
							<Typography sx={fieldLabelSx(T)}>Status</Typography>
							<Stack direction="row" spacing={0.75}>
								{[
									{ value: true, label: 'Active' },
									{ value: false, label: 'Paused' }
								].map(({ value, label }) => {
									const active = !!formData.valid === value;
									return (
										<Box
											key={String(value)}
											onClick={() => setFormData(prev => ({ ...prev, valid: value }))}
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

						<Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ marginTop: 3 }}>
							{isEdit && (
								<Box
									component="button"
									type="button"
									onClick={handleDelete}
									sx={{
										marginRight: 'auto',
										background: 'transparent',
										color: T.neg,
										border: `1px solid ${T.neg}33`,
										borderRadius: '999px',
										padding: '9px 18px',
										fontSize: 12,
										fontWeight: 700,
										fontFamily: 'inherit',
										textTransform: 'none',
										cursor: 'pointer',
										display: 'inline-flex',
										alignItems: 'center',
										gap: '6px',
										'&:hover': { background: `${T.neg}11`, borderColor: T.neg }
									}}
								>
									<DeleteOutlineIcon sx={{ fontSize: 14 }} /> Delete
								</Box>
							)}
							<Box
								component="button"
								type="button"
								onClick={handleClose}
								sx={{
									background: 'transparent',
									color: T.ink2,
									border: `1px solid ${T.rule}`,
									borderRadius: '999px',
									padding: '9px 18px',
									fontSize: 12,
									fontWeight: 700,
									fontFamily: 'inherit',
									cursor: 'pointer',
									'&:hover': { background: T.surf2 }
								}}
							>
								Cancel
							</Box>
							<Box
								component="button"
								type="submit"
								sx={{
									background: T.acc.bright,
									color: T.acc.deep,
									border: 'none',
									borderRadius: '999px',
									padding: '9px 18px',
									fontSize: 12,
									fontWeight: 700,
									fontFamily: 'inherit',
									cursor: 'pointer',
									'&:hover': { opacity: 0.9 }
								}}
							>
								{isEdit ? 'Save' : 'Create'}
							</Box>
						</Stack>
					</Box>
				</Box>
			</Dialog>
		</Stack>
	);
}
