import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import MuiChip from '@mui/material/Chip';

import moment from 'moment';

import DesignPage from '../components/DesignPage';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';

import useT from '../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency } from '../utils/designTokens';

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

const RANGE_OPTIONS = [
	{ value: '1m', label: '1M', months: 1 },
	{ value: '3m', label: '3M', months: 3 },
	{ value: '6m', label: '6M', months: 6 },
	{ value: '1y', label: '1Y', months: 12 },
	{ value: 'all', label: 'All', months: null }
];

function Chip ({ active, onClick, T, children }) {
	const inactiveBg = T.dark ? 'rgba(255,255,255,0.06)' : '#f1f1ee';
	return (
		<Box
			onClick={onClick}
			sx={{
				padding: '6px 12px',
				fontSize: 11,
				fontWeight: 600,
				borderRadius: '999px',
				background: active ? T.acc.bright : inactiveBg,
				color: active ? T.acc.deep : T.ink,
				cursor: 'pointer',
				border: active ? 'none' : `1px solid ${T.rule}`,
				display: 'inline-flex',
				alignItems: 'center',
				whiteSpace: 'nowrap',
				transition: 'all 0.15s'
			}}
		>
			{children}
		</Box>
	);
}

const Transactions = () => {
	const T = useT();
	const lab = labelStyle(T);

	const allAccountsTransactions = useSelector(state => state.allAccountsTransactions);
	const accountList = useSelector(state => state.accountList);
	const { currency: displayCurrency = 'KRW', exchangeRate } = useSelector(state => state.settings);

	const [selectedRange, setSelectedRange] = useState('1m');
	const [filteredAccounts, setFilteredAccounts] = useState([]);
	const initialized = useRef(false);

	const dateRange = useMemo(() => {
		const opt = RANGE_OPTIONS.find(o => o.value === selectedRange) || RANGE_OPTIONS[0];
		const end = moment();
		const start = opt.months === null ? moment('2000-01-01') : moment().subtract(opt.months, 'months');
		return { start, end };
	}, [selectedRange]);

	const allBankAccounts = useMemo(() => {
		const validTypes = ['Bank', 'CCard', 'Cash'];
		if (!accountList) return [];
		return accountList
			.filter(a => validTypes.includes(a.type) && !a.closed)
			.map(a => a.name);
	}, [accountList]);

	useEffect(() => {
		if (!initialized.current && allBankAccounts.length > 0) {
			setFilteredAccounts(allBankAccounts);
			initialized.current = true;
		}
	}, [allBankAccounts]);

	const filteredTransactions = useMemo(() => {
		const validTypes = ['Bank', 'CCard', 'Cash'];
		if (!filteredAccounts || filteredAccounts.length === 0) return [];

		return (allAccountsTransactions || []).filter(t => {
			const accountId = t.accountId;
			const type = accountId && accountId.split(':')[1];
			if (!validTypes.includes(type)) return false;

			const accountName = accountId.split(':')[2];
			if (!filteredAccounts.includes(accountName)) return false;

			const date = moment(t.date);
			return date.isSameOrAfter(dateRange.start, 'day') && date.isSameOrBefore(dateRange.end, 'day');
		});
	}, [allAccountsTransactions, dateRange, filteredAccounts]);

	const stats = useMemo(() => {
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
		const accMap = new Map((accountList || []).map(a => [a._id, a]));
		const conv = (amount, txCur) => {
			if (txCur === displayCurrency) return amount;
			if (txCur === 'USD') return amount * validRate;
			if (txCur === 'KRW') return amount / validRate;
			return amount;
		};
		let income = 0;
		let expense = 0;
		let countIncome = 0;
		let countExpense = 0;
		filteredTransactions.forEach(t => {
			if (isInternalTransfer(t)) return;
			const acc = accMap.get(t.accountId);
			const txCur = acc?.currency || 'KRW';
			const amt = conv(Number(t.amount) || 0, txCur);
			if (amt > 0) { income += amt; countIncome += 1; }
			else if (amt < 0) { expense += amt; countExpense += 1; }
		});
		const net = income + expense;
		return {
			income,
			expense: Math.abs(expense),
			net,
			countIncome,
			countExpense,
			total: filteredTransactions.length
		};
	}, [filteredTransactions, accountList, exchangeRate, displayCurrency]);

	const allFilteredCount = filteredAccounts.length;
	const accountsAllSelected = allFilteredCount === allBankAccounts.length;

	const setAccounts = (vals) => {
		setFilteredAccounts(vals);
	};

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
	const heroDivider = T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)';

	const rangeLabel = selectedRange === 'all'
		? 'All time'
		: `${dateRange.start.format('MMM D, YYYY')} → ${dateRange.end.format('MMM D, YYYY')}`;

	return (
		<DesignPage title="Transactions" titleKo="거래" fillViewport>
			{/* Hero panel */}
			<Box sx={{
				position: 'relative',
				overflow: 'hidden',
				background: heroBg,
				borderRadius: '20px',
				padding: { xs: '20px', md: '28px' },
				color: heroInk
			}}>
				<Box sx={{
					position: 'absolute',
					top: -100,
					right: -100,
					width: 360,
					height: 360,
					borderRadius: '50%',
					background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
					pointerEvents: 'none'
				}}/>
				<Box sx={{ position: 'relative', minWidth: 0 }}>
					<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
						Net flow · 순흐름 · {rangeLabel}
					</Typography>
					<Typography sx={{
						...sDisplay,
						fontSize: { xs: 32, sm: 42, md: 52 },
						fontWeight: 700,
						lineHeight: 1,
						marginTop: '12px',
						color: stats.net < 0 ? '#fb7185' : heroInk,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					}}>
						{stats.net >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(stats.net), displayCurrency)}
					</Typography>
					<Typography sx={{ ...sMono, fontSize: 13, color: heroDim, marginTop: '6px' }}>
						{stats.total.toLocaleString()} transactions
					</Typography>
				</Box>
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(3, 1fr)' },
					gap: { xs: 1.5, md: 3 },
					marginTop: { xs: '20px', md: '28px' },
					position: 'relative'
				}}>
					{[
						{ label: 'Income · 수입', value: `+${fmtCurrency(stats.income, displayCurrency)}`, sub: `${stats.countIncome} txns`, color: '#34d399', divider: false },
						{ label: 'Expense · 지출', value: `−${fmtCurrency(stats.expense, displayCurrency)}`, sub: `${stats.countExpense} txns`, color: '#fb7185', divider: true },
						{ label: 'Accounts · 계좌', value: accountsAllSelected ? `All ${allBankAccounts.length}` : `${allFilteredCount} / ${allBankAccounts.length}`, sub: 'selected', color: heroInk, divider: true }
					].map(s => (
						<Box key={s.label} sx={{
							borderLeft: { xs: 'none', md: s.divider ? `1px solid ${heroDivider}` : 'none' },
							paddingLeft: { xs: 0, md: s.divider ? '24px' : 0 },
							minWidth: 0
						}}>
							<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
								{s.label}
							</Typography>
							<Typography sx={{
								...sDisplay,
								...sMono,
								fontSize: { xs: 16, md: 22 },
								fontWeight: 700,
								marginTop: '6px',
								color: s.color,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap'
							}}>
								{s.value}
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 11, color: heroDim, marginTop: '2px' }}>{s.sub}</Typography>
						</Box>
					))}
				</Box>
			</Box>

			{/* Filters panel */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '14px', md: '18px' },
				color: T.ink
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
						Filters
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 필터</Box>
					</Typography>
				</Stack>

				<Box sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...lab, marginBottom: '6px' }}>Date range · 기간</Typography>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
						{RANGE_OPTIONS.map(opt => (
							<Chip
								key={opt.value}
								active={selectedRange === opt.value}
								onClick={() => setSelectedRange(opt.value)}
								T={T}
							>
								{opt.label}
							</Chip>
						))}
					</Stack>
				</Box>

				{allBankAccounts.length > 0 && (
					<Box>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: '6px' }}>
							<Typography sx={lab}>
								Accounts · 계좌
								{!accountsAllSelected && (
									<Box component="span" sx={{ color: T.acc.hero, marginLeft: '6px' }}>({allFilteredCount})</Box>
								)}
							</Typography>
							{!accountsAllSelected && (
								<Box
									component="span"
									onClick={() => setAccounts(allBankAccounts)}
									sx={{ fontSize: 11, color: T.acc.hero, cursor: 'pointer', fontWeight: 600 }}
								>
									All
								</Box>
							)}
						</Stack>
						<Autocomplete
							multiple
							size="small"
							options={allBankAccounts}
							value={filteredAccounts}
							onChange={(_, val) => setAccounts(val)}
							disableCloseOnSelect
							limitTags={6}
							ChipProps={{ size: 'small' }}
							renderTags={(values, getTagProps) =>
								values.map((option, idx) => {
									const { key, ...chipProps } = getTagProps({ index: idx });
									return (
										<MuiChip
											key={key}
											{...chipProps}
											label={option}
											size="small"
											sx={{
												background: T.acc.bg,
												color: T.acc.deep,
												fontWeight: 600,
												'& .MuiChip-deleteIcon': { color: T.acc.deep, '&:hover': { color: T.acc.hero } }
											}}
										/>
									);
								})
							}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder={filteredAccounts.length === 0 ? 'Select accounts…' : ''}
									sx={{
										'& .MuiOutlinedInput-root': {
											background: T.bg,
											borderRadius: '8px',
											fontSize: 13,
											color: T.ink
										},
										'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
										'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
										'& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
										'& input::placeholder': { color: T.ink3, opacity: 1 }
									}}
								/>
							)}
							slotProps={{
								paper: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } }
							}}
						/>
					</Box>
				)}
			</Box>

			{/* Results */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '16px', md: '20px' },
				color: T.ink,
				display: 'flex',
				flexDirection: 'column',
				flex: { md: 1 },
				minHeight: { md: 0 }
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>
						Results
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 14 }}> · {stats.total.toLocaleString()}건</Box>
					</Typography>
					{stats.total > 0 && (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>Sorted by date · newest first</Typography>
					)}
				</Stack>

				{stats.total === 0 ? (
					<Box sx={{ padding: '60px 0', textAlign: 'center', color: T.ink2 }}>
						<Typography sx={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
							No transactions in this range
						</Typography>
						<Typography sx={{ fontSize: 12, color: T.ink3, marginTop: 0.5 }}>
							Try a wider date range or include more accounts.
						</Typography>
					</Box>
				) : (
					<Box sx={{
						flex: { md: 1 },
						minHeight: { md: 0 },
						height: { xs: 600, md: 'auto' }
					}}>
						<BankTransactions showAccount transactions={filteredTransactions} />
					</Box>
				)}
			</Box>

			<BankTransactionModal isEdit transactions={filteredTransactions} />
		</DesignPage>
	);
};

export default Transactions;
