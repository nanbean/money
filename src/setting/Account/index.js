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
import { makeIsInvestmentCash } from '../../utils/investmentCash';
import { accountDeletePlan } from './deleteGuard';
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
	fontSize: { xs: 16, sm: 13 },
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
	// 삭제는 확인을 거친다. 거래가 남아 있으면 아예 막고 closed 로 유도한다.
	const [deletePlan, setDeletePlan] = useState(null);
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
		// 투자현금 계좌는 목록에 노출하지 않는다 — 부모 투자 계좌로 관리한다.
		const isInvCash = makeIsInvestmentCash(accountList);
		const list = (accountList || []).filter(a => !isInvCash(a));

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
		// 편집에서는 _id 를 그대로 둔다. CouchDB _id 는 불변인데 이름과 종류가 그
		// 안에 들어 있어서, 새로 조립하면 editAccountAction 이 존재하지 않는 문서를
		// get() 해 404 -> catch -> console.log 로 빠진다. 저장을 눌러도 아무 일도
		// 일어나지 않고 오류도 보이지 않는다.
		const newData = isEdit
			? formData
			: { ...formData, _id: `account:${formData.type}:${formData.name}` };
		if (isEdit) dispatch(editAccountAction(newData));
		else dispatch(addAccountAction(newData));
		handleClose();
	};

	const handleDelete = () => {
		const account = accountList.find(a => a._id === formData._id) || formData;
		setDeletePlan(accountDeletePlan(account, accountList, allAccountsTransactions));
	};

	const closeDeletePlan = () => setDeletePlan(null);

	const confirmDelete = () => {
		dispatch(deleteAccountAction(deletePlan.targets[0]));
		closeDeletePlan();
		handleClose();
	};

	// 삭제 대신 닫기. 이력과 순자산을 보존하면서 목록에서만 내린다.
	const closeAccountInstead = () => {
		deletePlan.targets.forEach(target => {
			dispatch(editAccountAction({ ...target, closed: true }));
		});
		closeDeletePlan();
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
			{/* 삭제 확인. 예전에는 Delete 클릭이 곧바로 dispatch 였고 되돌릴 수도
			    없었다. '토지주택' 한 번으로 순자산에서 ₩17.3억이 사라진다. */}
			<Dialog
				open={!!deletePlan}
				onClose={closeDeletePlan}
				fullWidth
				maxWidth="xs"
				PaperProps={{
					sx: {
						background: T.surf,
						border: `1px solid ${T.rule}`,
						borderRadius: '20px',
						color: T.ink
					}
				}}
			>
				{deletePlan && (
					<Box sx={{ padding: { xs: '20px', md: '28px' } }}>
						<Typography sx={{
							fontSize: 11,
							color: T.ink3,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							fontWeight: 600
						}}>
							{deletePlan.blocked ? 'Cannot delete' : 'Delete account'}
						</Typography>
						<Typography sx={{ ...sDisplay, fontSize: 20, fontWeight: 700, marginTop: '4px', color: T.ink }}>
							{deletePlan.targets.map(a => a.name).join(' + ')}
						</Typography>

						{deletePlan.blocked ? (
							<>
								<Typography sx={{ fontSize: 13, color: T.ink, marginTop: 2, lineHeight: 1.6 }}>
									거래 <Box component="span" sx={{ ...sMono, fontWeight: 700 }}>{deletePlan.transactionCount.toLocaleString()}</Box>건이
									이 계좌를 참조하고 있어 삭제할 수 없습니다.
								</Typography>
								<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: 1.25, lineHeight: 1.6 }}>
									계좌를 지워도 거래는 남습니다. 그러면 잔액
									<Box component="span" sx={{ ...sMono, color: T.ink, fontWeight: 600 }}> {fmtCurrency(deletePlan.balance, currency)}</Box>
									이 순자산에서 사라지는데 지출 집계에는 그대로 남아 숫자가 어긋납니다.
								</Typography>
								<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: 1.25, lineHeight: 1.6 }}>
									대신 <b>닫기</b>를 쓰면 목록에서만 내려가고 이력과 순자산은 보존됩니다.
								</Typography>
							</>
						) : (
							<>
								<Typography sx={{ fontSize: 13, color: T.ink, marginTop: 2, lineHeight: 1.6 }}>
									참조하는 거래가 없어 삭제할 수 있습니다.
								</Typography>
								{deletePlan.cascade && (
									<Typography sx={{ fontSize: 12, color: T.neg, marginTop: 1.25, lineHeight: 1.6 }}>
										동반 계좌 <b>{deletePlan.cascade.name}</b> 도 함께 삭제됩니다 (계좌 문서 {deletePlan.targets.length}개).
									</Typography>
								)}
								<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: 1.25, lineHeight: 1.6 }}>
									이체 카테고리 <b>[{deletePlan.targets[0].name}]</b> 는 남습니다 — 과거 거래가 이 이름을 참조합니다.
								</Typography>
							</>
						)}

						<Stack direction="row" spacing={1} sx={{ marginTop: 3, justifyContent: 'flex-end', flexWrap: 'wrap', rowGap: 1 }}>
							<Button
								onClick={closeDeletePlan}
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
								돌아가기
							</Button>
							{deletePlan.blocked ? (
								<Button
									onClick={closeAccountInstead}
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
									닫기로 전환
								</Button>
							) : (
								<Button
									onClick={confirmDelete}
									startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
									sx={{
										background: 'transparent',
										border: `1px solid ${T.neg}`,
										color: T.neg,
										borderRadius: '999px',
										padding: '8px 16px',
										fontSize: 12,
										fontWeight: 700,
										textTransform: 'none',
										'&:hover': { background: `${T.neg}11` }
									}}
								>
									삭제
								</Button>
							)}
						</Stack>
					</Box>
				)}
			</Dialog>

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
							{/* 이름과 종류는 _id 에 들어가고 _id 는 불변이다. 이름 하나를
							    바꾸면 거래 accountId·거래 _id 접두어·이체 카테고리까지
							    2만 건 넘는 참조를 함께 고쳐야 한다. 잠그는 것이 맞지만
							    이유는 보여야 한다. */}
							{isEdit && (
								<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: '6px' }}>
									이름과 종류는 생성 후 변경할 수 없습니다 — 거래 내역이 이 값으로 계좌를 참조합니다.
								</Typography>
							)}
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
