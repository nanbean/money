import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

import DesignPage from '../components/DesignPage';
import BankTransactions from '../components/BankTransactions';
import BankTransactionModal from '../components/BankTransactionModal';

import useT from '../hooks/useT';
import { sDisplay, fmtCurrencyFull } from '../utils/designTokens';

import { setAccountAction } from '../actions/accountActions';
import { openTransactionInModal } from '../actions/ui/form/bankTransaction';

import { TYPE_NAME_MAP } from '../constants';

const TYPE_KO = {
	'Bank': '은행',
	'CCard': '신용카드',
	'Cash': '현금',
	'Oth A': '부동산·실물',
	'Oth L': '부채'
};

const getAccountId = pathname =>
	`account${decodeURI(pathname.replace(/\//g, ':')).replace(/%20/g, ' ')}`;
const getAccountTransactions = (transactions, accountId) =>
	transactions.filter(i => i.accountId === accountId);

export function Bank () {
	const dispatch = useDispatch();
	const T = useT();

	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);

	const { name } = useParams();
	const { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountMeta = useMemo(
		() => (accountList || []).find(a => a._id === accountId),
		[accountList, accountId]
	);
	const type = accountMeta?.type || pathname.split('/')[1] || 'Bank';
	const typeEn = TYPE_NAME_MAP[type] || type;
	const typeKo = TYPE_KO[type] || '';
	const currency = accountMeta?.currency || 'KRW';

	const [endDate, setEndDate] = useState('');
	const [query, setQuery] = useState('');

	const accountTransactions = useMemo(() => {
		let tx = getAccountTransactions(allAccountsTransactions, accountId);
		if (endDate) tx = tx.filter(i => i.date <= endDate);
		const q = query.trim().toLowerCase();
		if (q) {
			tx = tx.filter(i =>
				(i.payee && i.payee.toLowerCase().includes(q)) ||
				(i.memo && i.memo.toLowerCase().includes(q)) ||
				(i.category && i.category.toLowerCase().includes(q))
			);
		}
		return tx;
	}, [allAccountsTransactions, accountId, endDate, query]);

	const balance = useMemo(() => {
		if (accountTransactions.length === 0) return 0;
		return accountTransactions.map(i => i.amount).reduce((a, b) => a + b, 0);
	}, [accountTransactions]);

	useEffect(() => {
		dispatch(setAccountAction(name));
	}, [name, dispatch]);

	const onNewClick = () => dispatch(openTransactionInModal());

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';

	const hero = (
		<Box sx={{
			position: 'relative',
			overflow: 'hidden',
			background: heroBg,
			borderRadius: { xs: '16px', md: '24px' },
			padding: { xs: '24px', md: '36px' },
			color: heroInk
		}}>
			<Box sx={{
				position: 'absolute',
				bottom: -80,
				right: -80,
				width: 280,
				height: 280,
				borderRadius: '50%',
				background: `radial-gradient(circle, ${T.acc.bright}55 0%, transparent 70%)`,
				pointerEvents: 'none'
			}}/>
			<Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={2} sx={{ position: 'relative' }}>
				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{
						fontSize: 11,
						color: heroDim,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						fontWeight: 600
					}}>
						{typeEn}{typeKo && ` · ${typeKo}`} · {name}
					</Typography>
					<Typography sx={{
						...sDisplay,
						fontSize: { xs: 28, sm: 36, md: 48 },
						fontWeight: 700,
						lineHeight: 1.1,
						marginTop: '14px',
						color: balance < 0 ? '#fb7185' : heroInk,
						wordBreak: 'break-word'
					}}>
						{fmtCurrencyFull(balance, currency)}
					</Typography>
					<Typography sx={{ fontSize: 12, color: heroDim, marginTop: 1, ...sDisplay, letterSpacing: '0.04em' }}>
						{accountTransactions.length} transactions
					</Typography>
				</Box>
				<Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
					<Button
						onClick={onNewClick}
						startIcon={<AddIcon />}
						sx={{
							background: T.acc.bright,
							color: T.acc.deep,
							border: 'none',
							borderRadius: '999px',
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 700,
							textTransform: 'none',
							'&:hover': { background: T.acc.bright, opacity: 0.9 }
						}}
					>
						New transaction
					</Button>
				</Stack>
			</Stack>
		</Box>
	);

	const filterRow = (
		<Stack
			direction={{ xs: 'column', md: 'row' }}
			alignItems={{ xs: 'stretch', md: 'center' }}
			spacing={1.5}
			sx={{ marginBottom: 1.5 }}
		>
			<Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
				<Typography sx={{ fontSize: 12, color: T.ink2 }}>Show on or before</Typography>
				<Box
					component="input"
					type="date"
					value={endDate}
					onChange={e => setEndDate(e.target.value)}
					sx={{
						background: T.surf,
						color: T.ink,
						border: `1px solid ${T.rule}`,
						borderRadius: '8px',
						padding: '6px 10px',
						fontSize: 13,
						fontFamily: 'inherit',
						colorScheme: T.dark ? 'dark' : 'light',
						outline: 'none',
						'&:focus': { borderColor: T.acc.hero }
					}}
				/>
				{endDate && (
					<Box
						component="button"
						onClick={() => setEndDate('')}
						sx={{
							background: 'transparent',
							color: T.ink2,
							border: `1px solid ${T.rule}`,
							borderRadius: '8px',
							padding: '6px 10px',
							fontSize: 12,
							cursor: 'pointer',
							fontFamily: 'inherit',
							'&:hover': { color: T.ink }
						}}
					>
						Clear
					</Box>
				)}
			</Stack>
			<Box sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 1,
				background: T.bg,
				border: `1px solid ${T.rule}`,
				borderRadius: '8px',
				padding: '4px 10px',
				flex: 1,
				minWidth: 0,
				transition: 'border-color 0.12s',
				'&:focus-within': { borderColor: T.acc.hero }
			}}>
				<SearchIcon sx={{ fontSize: 16, color: T.ink2, flexShrink: 0 }} />
				<Box
					component="input"
					type="text"
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder="Search payee, memo, category…"
					sx={{
						flex: 1,
						background: 'transparent',
						border: 'none',
						outline: 'none',
						color: T.ink,
						fontSize: 13,
						fontFamily: 'inherit',
						padding: '6px 0',
						minWidth: 0,
						'::placeholder': { color: T.ink3 }
					}}
				/>
				{query && (
					<Box
						component="button"
						onClick={() => setQuery('')}
						sx={{
							background: 'transparent',
							border: 'none',
							color: T.ink2,
							cursor: 'pointer',
							display: 'inline-flex',
							padding: 0,
							flexShrink: 0,
							'&:hover': { color: T.ink }
						}}
					>
						<CloseIcon sx={{ fontSize: 16 }} />
					</Box>
				)}
			</Box>
		</Stack>
	);

	return (
		<DesignPage title={name} titleKo={typeKo || '계좌'} fillViewport>
			{hero}

			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '16px', md: '20px' },
				color: T.ink,
				display: 'flex',
				flexDirection: 'column',
				// Desktop: fill leftover height inside DesignPage's viewport-fit container.
				flex: { md: 1 },
				minHeight: { md: 0 }
			}}>
				{filterRow}
				<Box sx={{
					// Mobile: explicit pixel height (page is natural flow).
					// Desktop: flex:1 — parent has measurable height so the virtualizer
					// reads its scroll container size correctly.
					flex: { md: 1 },
					minHeight: { md: 0 },
					height: { xs: 600, md: 'auto' }
				}}>
					<BankTransactions
						account={account}
						currency={currency}
						transactions={accountTransactions}
					/>
				</Box>
			</Box>

			<BankTransactionModal
				accountId={accountId}
				account={account}
				transactions={accountTransactions}
			/>
		</DesignPage>
	);
}

export default Bank;
