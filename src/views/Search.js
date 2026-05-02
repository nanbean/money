import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import MuiChip from '@mui/material/Chip';

import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import DesignPage from '../components/DesignPage';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';

import useT from '../hooks/useT';
import { sDisplay, labelStyle, fmtCurrency } from '../utils/designTokens';

const isInternalTransfer = (t) => /^\[.*\]$/.test(t.category || '');

const TYPE_OPTIONS = [
	{ value: 'all', en: 'All', ko: '전체' },
	{ value: 'expense', en: 'Expense', ko: '지출' },
	{ value: 'income', en: 'Income', ko: '수입' }
];

function Chip ({ active, onClick, T, children, color }) {
	const inactiveBg = T.dark ? 'rgba(255,255,255,0.06)' : '#f1f1ee';
	const activeBg = color || T.acc.bright;
	const activeFg = color ? '#fff' : T.acc.deep;
	return (
		<Box
			onClick={onClick}
			sx={{
				padding: '6px 12px',
				fontSize: 11,
				fontWeight: 600,
				borderRadius: '999px',
				background: active ? activeBg : inactiveBg,
				color: active ? activeFg : T.ink,
				cursor: 'pointer',
				border: active ? 'none' : `1px solid ${T.rule}`,
				display: 'inline-flex',
				alignItems: 'center',
				gap: 0.75,
				whiteSpace: 'nowrap',
				transition: 'all 0.15s'
			}}
		>
			{children}
		</Box>
	);
}

const formatDateOnly = (d) => d.toISOString().slice(0, 10);

export function Search () {
	const T = useT();
	const lab = labelStyle(T);

	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const { exchangeRate, currency = 'KRW', categoryList = [] } = useSelector((state) => state.settings || {});

	const allBankAccounts = useMemo(
		() => (accountList || [])
			.filter(i => (i.type === 'CCard' || i.type === 'Bank' || i.type === 'Cash') && !i.closed)
			.map(j => j.name),
		[accountList]
	);

	const [searchParams, setSearchParams] = useSearchParams();
	const keyword = searchParams.get('keyword') || '';
	const categoriesParam = searchParams.get('categories') || searchParams.get('category') || '';
	const subcategory = searchParams.get('subcategory') || '';
	const startDate = searchParams.get('startDate') || '';
	const endDate = searchParams.get('endDate') || '';
	const amtMin = searchParams.get('amtMin') || '';
	const amtMax = searchParams.get('amtMax') || '';
	const type = searchParams.get('type') || 'all';
	const accountsParam = searchParams.get('accounts') || '';

	const selectedCategories = useMemo(
		() => (categoriesParam ? categoriesParam.split(',').filter(Boolean) : []),
		[categoriesParam]
	);
	const selectedAccounts = useMemo(() => {
		if (!accountsParam) return allBankAccounts;
		return accountsParam.split(',').filter(Boolean);
	}, [accountsParam, allBankAccounts]);

	const [inputValue, setInputValue] = useState(keyword);

	useEffect(() => {
		setInputValue(keyword);
	}, [keyword]);

	const updateParams = (patch) => {
		const next = new URLSearchParams(searchParams);
		Object.entries(patch).forEach(([k, v]) => {
			if (v === undefined || v === null || v === '' || (k === 'type' && v === 'all')) {
				next.delete(k);
			} else {
				next.set(k, String(v));
			}
		});
		// migrate: if we touched `categories`, drop legacy `category` key
		if (patch.categories !== undefined) {
			next.delete('category');
		}
		setSearchParams(next, { replace: true });
	};

	// Debounce keyword updates to URL
	useEffect(() => {
		const handle = setTimeout(() => {
			if (inputValue !== keyword) updateParams({ keyword: inputValue });
		}, 200);
		return () => clearTimeout(handle);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [inputValue]);

	const dateRangeInvalid = !!(startDate && endDate && startDate > endDate);

	const hasFilters = !!(keyword || selectedCategories.length || subcategory || startDate || endDate || amtMin || amtMax || (type && type !== 'all') || accountsParam);

	const filteredTransactions = useMemo(() => {
		if (!hasFilters) return [];

		const safeAccounts = selectedAccounts.length > 0 ? selectedAccounts : allBankAccounts;
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;

		const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const kwRegex = keyword ? new RegExp(escapeRegex(keyword), 'i') : null;
		const subcatRegex = subcategory ? new RegExp(escapeRegex(subcategory), 'i') : null;
		const categoriesSet = selectedCategories.length > 0 ? new Set(selectedCategories) : null;

		const accMap = new Map((accountList || []).map(a => [a._id, a]));

		return (allAccountsTransactions || []).filter(t => {
			const accountIdParts = t?.accountId?.split(':');
			const accountName = accountIdParts?.[2];
			if (!safeAccounts.includes(accountName)) return false;

			if (categoriesSet) {
				const baseCat = t.category || '';
				const fullCat = t.subcategory ? `${baseCat}:${t.subcategory}` : baseCat;
				if (!categoriesSet.has(fullCat) && !categoriesSet.has(baseCat)) return false;
			}
			if (subcatRegex && !(t.subcategory && subcatRegex.test(t.subcategory))) return false;
			if (startDate && t.date < startDate) return false;
			if (endDate && t.date > endDate) return false;

			if (kwRegex) {
				const hit = (t.payee && kwRegex.test(t.payee)) || (t.memo && kwRegex.test(t.memo));
				if (!hit) return false;
			}

			if (type === 'expense' && t.amount >= 0) return false;
			if (type === 'income' && t.amount <= 0) return false;

			if (amtMin || amtMax) {
				const acc = accMap.get(t.accountId);
				const txCur = acc?.currency || 'KRW';
				let krwAmount = Math.abs(Number(t.amount) || 0);
				if (txCur === 'USD') krwAmount = krwAmount * validRate;
				if (amtMin && krwAmount < Number(amtMin)) return false;
				if (amtMax && krwAmount > Number(amtMax)) return false;
			}

			return true;
		});
	}, [allAccountsTransactions, accountList, hasFilters, selectedAccounts, allBankAccounts, keyword, selectedCategories, subcategory, startDate, endDate, amtMin, amtMax, type, exchangeRate]);

	const stats = useMemo(() => {
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
		const accMap = new Map((accountList || []).map(a => [a._id, a]));
		const conv = (t) => {
			const acc = accMap.get(t.accountId);
			const txCur = acc?.currency || 'KRW';
			const abs = Math.abs(Number(t.amount) || 0);
			if (txCur === currency) return abs;
			return currency === 'KRW' ? abs * validRate : abs / validRate;
		};
		const real = filteredTransactions.filter(t => !isInternalTransfer(t));
		const expenseTxns = real.filter(t => t.amount < 0);
		const incomeTxns = real.filter(t => t.amount > 0);
		const expense = expenseTxns.reduce((s, t) => s + conv(t), 0);
		const income = incomeTxns.reduce((s, t) => s + conv(t), 0);
		const total = real.reduce((s, t) => s + conv(t), 0);
		const avg = real.length > 0 ? total / real.length : 0;
		return {
			matches: filteredTransactions.length,
			expense,
			income,
			expenseCount: expenseTxns.length,
			incomeCount: incomeTxns.length,
			avg
		};
	}, [filteredTransactions, accountList, exchangeRate, currency]);

	const setRangeDays = (days) => {
		const end = new Date();
		const start = new Date(end);
		start.setDate(end.getDate() - days + 1);
		updateParams({ startDate: formatDateOnly(start), endDate: formatDateOnly(end) });
	};
	const setRangeThisMonth = () => {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		updateParams({ startDate: formatDateOnly(start), endDate: formatDateOnly(end) });
	};
	const setRangeLastMonth = () => {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const end = new Date(now.getFullYear(), now.getMonth(), 0);
		updateParams({ startDate: formatDateOnly(start), endDate: formatDateOnly(end) });
	};

	const clearAll = () => setSearchParams({}, { replace: true });

	const setCategories = (arr) => {
		updateParams({ categories: arr.join(','), subcategory: '' });
	};

	const setAccounts = (arr) => {
		// If selecting all accounts, clear the param
		if (arr.length === 0 || arr.length === allBankAccounts.length) {
			updateParams({ accounts: '' });
		} else {
			updateParams({ accounts: arr.join(',') });
		}
	};

	const activeFilterCount =
		(keyword ? 1 : 0) +
		(selectedCategories.length ? 1 : 0) +
		(startDate || endDate ? 1 : 0) +
		(amtMin || amtMax ? 1 : 0) +
		(type !== 'all' ? 1 : 0) +
		(accountsParam ? 1 : 0);

	const inputSx = {
		flex: 1,
		padding: '10px 12px',
		fontSize: 13,
		fontFamily: 'inherit',
		background: T.bg,
		color: T.ink,
		border: `1px solid ${T.rule}`,
		borderRadius: '8px',
		outline: 'none',
		colorScheme: T.dark ? 'dark' : 'light',
		'&:focus': { borderColor: T.acc.hero }
	};

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';

	return (
		<DesignPage title="Search" titleKo="검색" fillViewport>
			{/* Hero */}
			<Box sx={{
				position: 'relative',
				overflow: 'hidden',
				background: heroBg,
				borderRadius: { xs: '16px', md: '20px' },
				padding: { xs: '20px', md: '24px' },
				color: heroInk
			}}>
				<Box sx={{
					position: 'absolute', top: -100, right: -100,
					width: 400, height: 400, borderRadius: '50%',
					background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
					pointerEvents: 'none'
				}}/>
				<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={2} sx={{ position: 'relative' }}>
					<Typography sx={{ fontSize: 11, color: heroDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
						Search · 거래 검색
					</Typography>
					{activeFilterCount > 0 && (
						<Box
							component="button"
							onClick={clearAll}
							sx={{
								background: 'rgba(255,255,255,0.1)',
								border: '1px solid rgba(255,255,255,0.2)',
								color: heroInk,
								padding: '8px 14px',
								borderRadius: '999px',
								fontSize: 12,
								fontWeight: 600,
								fontFamily: 'inherit',
								cursor: 'pointer',
								display: 'inline-flex',
								alignItems: 'center',
								gap: 0.75,
								flexShrink: 0,
								'&:hover': { background: 'rgba(255,255,255,0.18)' }
							}}
						>
							<CloseIcon sx={{ fontSize: 14 }} />
							Clear all ({activeFilterCount})
						</Box>
					)}
				</Stack>
				<Box sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 1.5,
					marginTop: { xs: 2, md: 2.5 },
					background: 'rgba(255,255,255,0.08)',
					borderRadius: '14px',
					padding: '14px 18px',
					border: '1px solid rgba(255,255,255,0.15)'
				}}>
					<SearchIcon sx={{ fontSize: 20, color: heroInk }} />
					<Box
						component="input"
						value={inputValue}
						onChange={e => setInputValue(e.target.value)}
						placeholder="Search payee, memo..."
						sx={{
							flex: 1,
							background: 'transparent',
							border: 'none',
							outline: 'none',
							color: heroInk,
							fontSize: 16,
							fontFamily: 'inherit',
							'::placeholder': { color: heroDim }
						}}
					/>
					{inputValue && (
						<Box
							component="button"
							onClick={() => setInputValue('')}
							sx={{
								background: 'transparent',
								border: 'none',
								color: heroDim,
								cursor: 'pointer',
								display: 'inline-flex',
								padding: 0,
								'&:hover': { color: heroInk }
							}}
						>
							<CloseIcon sx={{ fontSize: 18 }} />
						</Box>
					)}
				</Box>
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
					gap: { xs: 1.5, md: 3 },
					marginTop: { xs: '16px', md: '20px' },
					position: 'relative'
				}}>
					{[
						{
							label: 'Matches · 결과',
							value: stats.matches.toLocaleString(),
							sub: null,
							color: heroInk,
							divider: false
						},
						{
							label: 'Total expenses · 지출',
							value: `−${fmtCurrency(stats.expense, currency)}`,
							sub: `${stats.expenseCount} txns`,
							color: stats.expense > 0 ? '#fb7185' : heroInk,
							divider: true
						},
						{
							label: 'Total income · 수입',
							value: `+${fmtCurrency(stats.income, currency)}`,
							sub: `${stats.incomeCount} txns`,
							color: stats.income > 0 ? '#34d399' : heroInk,
							divider: true
						},
						{
							label: 'Avg per txn · 건당 평균',
							value: stats.matches > 0 ? fmtCurrency(stats.avg, currency) : '—',
							sub: 'absolute',
							color: heroInk,
							divider: true
						}
					].map(item => (
						<Box key={item.label} sx={{
							borderLeft: { xs: 'none', md: item.divider ? `1px solid ${T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'}` : 'none' },
							paddingLeft: { xs: 0, md: item.divider ? '20px' : 0 },
							minWidth: 0
						}}>
							<Typography sx={{
								fontSize: 11,
								color: heroDim,
								textTransform: 'uppercase',
								letterSpacing: '0.06em',
								fontWeight: 500,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis'
							}}>
								{item.label}
							</Typography>
							<Typography sx={{
								...sDisplay,
								fontSize: { xs: 16, md: 20 },
								fontWeight: 700,
								marginTop: '4px',
								color: item.color,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis'
							}}>
								{item.value}
							</Typography>
							{item.sub && (
								<Typography sx={{ fontSize: 11, color: heroDim, marginTop: '2px' }}>
									{item.sub}
								</Typography>
							)}
						</Box>
					))}
				</Box>
			</Box>

			{/* Filters */}
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
					<Typography sx={{ fontSize: 11, color: T.ink3 }}>{activeFilterCount} active</Typography>
				</Stack>

				{/* Date range — inputs + quick chips on one row */}
				<Box sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...lab, marginBottom: '6px' }}>Date range · 기간</Typography>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
						<Box
							component="input"
							type="date"
							value={startDate}
							onChange={e => updateParams({ startDate: e.target.value })}
							sx={{ ...inputSx, flex: '0 0 150px' }}
						/>
						<Typography sx={{ color: T.ink3, fontSize: 13 }}>→</Typography>
						<Box
							component="input"
							type="date"
							value={endDate}
							onChange={e => updateParams({ endDate: e.target.value })}
							sx={{ ...inputSx, flex: '0 0 150px' }}
						/>
						<Chip onClick={() => setRangeDays(7)} T={T}>7d</Chip>
						<Chip onClick={() => setRangeDays(30)} T={T}>30d</Chip>
						<Chip onClick={() => setRangeDays(90)} T={T}>90d</Chip>
						<Chip onClick={setRangeThisMonth} T={T}>This mo.</Chip>
						<Chip onClick={setRangeLastMonth} T={T}>Last mo.</Chip>
						{(startDate || endDate) && (
							<Box
								component="span"
								onClick={() => updateParams({ startDate: '', endDate: '' })}
								sx={{ fontSize: 11, color: T.acc.hero, cursor: 'pointer', fontWeight: 600 }}
							>
								Clear
							</Box>
						)}
					</Stack>
					{dateRangeInvalid && (
						<Typography sx={{ fontSize: 11, color: T.neg, marginTop: 0.5 }}>
							시작일이 종료일보다 늦습니다.
						</Typography>
					)}
				</Box>

				{/* Categories + Accounts — side by side on desktop */}
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
					gap: 1.5,
					marginBottom: 1.5
				}}>
					{categoryList && categoryList.length > 0 && (
						<Box>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: '6px' }}>
								<Typography sx={lab}>
									Categories · 카테고리
									{selectedCategories.length > 0 && (
										<Box component="span" sx={{ color: T.acc.hero, marginLeft: '6px' }}>({selectedCategories.length})</Box>
									)}
								</Typography>
								{selectedCategories.length > 0 && (
									<Box
										component="span"
										onClick={() => setCategories([])}
										sx={{ fontSize: 11, color: T.acc.hero, cursor: 'pointer', fontWeight: 600 }}
									>
										Clear
									</Box>
								)}
							</Stack>
							<Autocomplete
								multiple
								size="small"
								options={categoryList}
								value={selectedCategories}
								onChange={(_, val) => setCategories(val)}
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
										placeholder={selectedCategories.length === 0 ? 'Select categories…' : ''}
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
	
					{/* Accounts */}
					{allBankAccounts.length > 0 && (
						<Box>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: '6px' }}>
								<Typography sx={lab}>
									Accounts · 계좌
									{accountsParam && <Box component="span" sx={{ color: T.acc.hero, marginLeft: '6px' }}>({selectedAccounts.length})</Box>}
								</Typography>
								{accountsParam && (
									<Box
										component="span"
										onClick={() => updateParams({ accounts: '' })}
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
								value={accountsParam ? selectedAccounts : []}
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
										placeholder={!accountsParam ? 'All accounts' : 'Select accounts…'}
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

				{/* Amount + Type */}
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 1.5 }}>
					<Box>
						<Typography sx={{ ...lab, marginBottom: '6px' }}>Amount range ({currency}) · 금액</Typography>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
							<Box
								component="input"
								type="number"
								placeholder="Min"
								value={amtMin}
								onChange={e => updateParams({ amtMin: e.target.value })}
								sx={inputSx}
							/>
							<Typography sx={{ color: T.ink3, fontSize: 13 }}>→</Typography>
							<Box
								component="input"
								type="number"
								placeholder="Max"
								value={amtMax}
								onChange={e => updateParams({ amtMax: e.target.value })}
								sx={inputSx}
							/>
							{(amtMin || amtMax) && (
								<Box
									component="span"
									onClick={() => updateParams({ amtMin: '', amtMax: '' })}
									sx={{ fontSize: 11, color: T.acc.hero, cursor: 'pointer', fontWeight: 600 }}
								>
									Clear
								</Box>
							)}
						</Stack>
					</Box>
					<Box>
						<Typography sx={{ ...lab, marginBottom: '6px' }}>Type · 거래 유형</Typography>
						<Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
							{TYPE_OPTIONS.map(({ value, en, ko }) => (
								<Chip
									key={value}
									active={type === value}
									onClick={() => updateParams({ type: value })}
									T={T}
								>
									{en} · {ko}
								</Chip>
							))}
						</Stack>
					</Box>
				</Box>
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
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 14 }}> · {stats.matches.toLocaleString()}건</Box>
					</Typography>
					{stats.matches > 0 && (
						<Typography sx={{ fontSize: 11, color: T.ink3 }}>Sorted by date · newest first</Typography>
					)}
				</Stack>

				{stats.matches === 0 ? (
					<Box sx={{ padding: '60px 0', textAlign: 'center', color: T.ink2 }}>
						<SearchIcon sx={{ fontSize: 28, color: T.ink2 }} />
						<Typography sx={{ marginTop: 1.5, fontSize: 14, fontWeight: 600, color: T.ink }}>
							{hasFilters ? 'No transactions match your filters' : '검색어 또는 필터를 입력하세요'}
						</Typography>
						<Typography sx={{ fontSize: 12, color: T.ink3, marginTop: 0.5 }}>
							{hasFilters
								? 'Try removing some filters or adjusting the date range.'
								: 'Use the search box or filters above to start.'}
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
}

export default Search;
