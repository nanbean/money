import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useParams } from 'react-router-dom';

import { CSVLink } from 'react-csv';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import AddIcon from '@mui/icons-material/Add';
import MoneyIcon from '@mui/icons-material/Money';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import AccountInvestments from '../components/AccountInvestments';
import DesignPage from '../components/DesignPage';
import InvestmentTransactions from '../components/InvestmentTransactions';
import InvestmentTransactionModal from '../components/InvestmentTransactionModal';

import useT from '../hooks/useT';
import { sDisplay, fmtCurrency, colorFor } from '../utils/designTokens';

import { setAccountAction } from '../actions/accountActions';
import { getAccountInvestmentsAction } from '../actions/couchdbAccountActions';
import { openTransactionInModal } from '../actions/ui/form/investmentTransaction';
import { getAccountPerformance } from '../utils/performance';

const csvHeaders = [
	{ label: 'Date', key: 'date' },
	{ label: 'Investment', key: 'investment' },
	{ label: 'Activity', key: 'activity' },
	{ label: 'Quantity', key: 'quantity' },
	{ label: 'Price', key: 'price' },
	{ label: 'Amount', key: 'amount' },
	{ label: 'Commission', key: 'commission' }
];

const getAccountId = pathname => `account${decodeURI(pathname.replace(/\//g, ':'))}`;
const getAccountTransactions = (transactions, accountId) =>
	transactions.filter(i => i.accountId === accountId);

function StatCard ({ label, value, color, T }) {
	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: { xs: '16px', md: '20px' },
			color: T.ink
		}}>
			<Typography sx={{
				fontSize: 11,
				fontWeight: 600,
				textTransform: 'uppercase',
				letterSpacing: '0.06em',
				color: T.ink2
			}}>
				{label}
			</Typography>
			<Typography sx={{
				...sDisplay,
				fontSize: 22,
				fontWeight: 700,
				marginTop: '10px',
				color: color || T.ink,
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			}}>
				{value}
			</Typography>
		</Box>
	);
}

export function Investment () {
	const dispatch = useDispatch();
	const T = useT();

	const account = useSelector((state) => state.account);
	const accountList = useSelector((state) => state.accountList);
	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const allInvestmentsPrice = useSelector((state) => state.allInvestmentsPrice);
	const accountInvestments = useSelector((state) => state.accountInvestments);

	const { name } = useParams();
	const { pathname } = useLocation();
	const accountId = useMemo(() => getAccountId(pathname), [pathname]);
	const accountMeta = useMemo(
		() => (accountList || []).find(a => a._id === accountId),
		[accountList, accountId]
	);
	const currency = accountMeta?.currency || 'KRW';
	const balance = Number(accountMeta?.balance) || 0;

	const accountTransactions = useMemo(
		() => getAccountTransactions(allAccountsTransactions, accountId),
		[allAccountsTransactions, accountId]
	);

	const allInvestmentsTransactions = useMemo(
		() => allAccountsTransactions.filter(i => i.accountId && i.accountId.startsWith('account:Invst')),
		[allAccountsTransactions]
	);

	const performance = useMemo(
		() => getAccountPerformance(name, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice) || [],
		[name, accountInvestments, allInvestmentsTransactions, allInvestmentsPrice]
	);

	const stats = useMemo(() => {
		if (!performance || performance.length === 0) {
			return { costBasis: 0, marketValue: 0, gain: 0, ret: 0, retPct: 0 };
		}
		const costBasis = performance.reduce((s, p) => s + p.costBasis, 0);
		const marketValue = performance.reduce((s, p) => s + p.marketValue, 0);
		const gain = performance.reduce((s, p) => s + p.periodGain, 0);
		const ret = performance.reduce((s, p) => s + p.periodReturn, 0);
		const retPct = costBasis > 0 ? (ret / costBasis) * 100 : 0;
		return { costBasis, marketValue, gain, ret, retPct };
	}, [performance]);

	useEffect(() => {
		dispatch(setAccountAction(name));
		dispatch(getAccountInvestmentsAction(accountId));
	}, [accountId, dispatch, name]);

	const onNewClick = () => dispatch(openTransactionInModal());

	const breadcrumb = (
		<Stack direction="row" alignItems="center" spacing={0.5} sx={{ fontSize: 12, color: T.ink2, marginBottom: 1.5 }}>
			<Box component={Link} to="/accounts" sx={{
				color: T.ink2, textDecoration: 'none',
				'&:hover': { color: T.ink }
			}}>Accounts</Box>
			<ChevronRightIcon sx={{ fontSize: 14, color: T.ink3 }} />
			<Box sx={{ color: T.ink2 }}>Investment</Box>
			<ChevronRightIcon sx={{ fontSize: 14, color: T.ink3 }} />
			<Box sx={{ color: T.ink, fontWeight: 600 }}>{name}</Box>
		</Stack>
	);

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, #5b4fd8 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';

	const hero = (
		<Box sx={{
			position: 'relative',
			overflow: 'hidden',
			background: heroBg,
			borderRadius: { xs: '16px', md: '24px' },
			padding: { xs: '24px', md: '36px' },
			color: heroInk,
			marginBottom: '20px'
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
			<Stack
				direction={{ xs: 'column', md: 'row' }}
				justifyContent="space-between"
				alignItems={{ xs: 'flex-start', md: 'flex-start' }}
				spacing={2}
				sx={{ position: 'relative' }}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{
						fontSize: 11,
						color: heroDim,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						fontWeight: 600
					}}>
						Investment · 투자 · {name}
					</Typography>
					<Typography sx={{
						...sDisplay,
						fontSize: { xs: 36, sm: 48, md: 60 },
						fontWeight: 700,
						lineHeight: 1,
						marginTop: '14px',
						color: balance < 0 ? '#fb7185' : heroInk
					}}>
						{fmtCurrency(balance, currency)}
					</Typography>
					{stats.costBasis > 0 && (
						<Stack direction="row" spacing={1.25} sx={{ marginTop: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
							<Box sx={{
								color: stats.ret >= 0 ? T.pos : T.neg,
								background: stats.ret >= 0 ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)',
								padding: '4px 10px',
								borderRadius: '999px',
								fontWeight: 600,
								fontSize: 13
							}}>
								{stats.ret >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(stats.ret), currency)}
								<Box component="span" sx={{ marginLeft: '6px', opacity: 0.85 }}>
									({stats.ret >= 0 ? '+' : ''}{stats.retPct.toFixed(2)}%)
								</Box>
							</Box>
							<Typography sx={{ color: heroDim, fontSize: 13 }}>
								Cost basis {fmtCurrency(stats.costBasis, currency)}
							</Typography>
						</Stack>
					)}
				</Box>
				<Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 1, justifyContent: 'flex-end' }}>
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
						New
					</Button>
					<Button
						component={Link}
						to={`/Bank/${name}_Cash`}
						startIcon={<MoneyIcon />}
						sx={{
							background: 'rgba(255,255,255,0.12)',
							color: heroInk,
							border: '1px solid rgba(255,255,255,0.2)',
							borderRadius: '999px',
							padding: '8px 18px',
							fontSize: 13,
							fontWeight: 600,
							textTransform: 'none',
							'&:hover': { background: 'rgba(255,255,255,0.18)' }
						}}
					>
						Cash
					</Button>
					<CSVLink
						data={accountTransactions}
						headers={csvHeaders}
						filename={`${name}-transactions.csv`}
						style={{ textDecoration: 'none' }}
					>
						<Button
							startIcon={<FileDownloadIcon />}
							sx={{
								background: 'rgba(255,255,255,0.12)',
								color: heroInk,
								border: '1px solid rgba(255,255,255,0.2)',
								borderRadius: '999px',
								padding: '8px 18px',
								fontSize: 13,
								fontWeight: 600,
								textTransform: 'none',
								'&:hover': { background: 'rgba(255,255,255,0.18)' }
							}}
						>
							CSV
						</Button>
					</CSVLink>
				</Stack>
			</Stack>
		</Box>
	);

	return (
		<DesignPage title={name} titleKo="투자 계좌">
			{breadcrumb}
			{hero}

			{/* Stat cards */}
			{stats.costBasis > 0 && (
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
					gap: 2,
					marginBottom: '20px'
				}}>
					<StatCard label="Cost basis · 원금" value={fmtCurrency(stats.costBasis, currency)} T={T} />
					<StatCard label="Market value · 평가액" value={fmtCurrency(stats.marketValue, currency)} T={T} />
					<StatCard
						label="Total return · 총수익"
						value={`${stats.ret >= 0 ? '+' : '−'}${fmtCurrency(Math.abs(stats.ret), currency)}`}
						color={colorFor(T, stats.ret)}
						T={T}
					/>
					<StatCard
						label="Return rate · 수익률"
						value={`${stats.retPct >= 0 ? '+' : ''}${stats.retPct.toFixed(2)}%`}
						color={colorFor(T, stats.retPct)}
						T={T}
					/>
				</Box>
			)}

			{/* Holdings */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '16px', md: '20px' },
				color: T.ink,
				marginBottom: '20px'
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>
						Holdings
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 보유 종목</Box>
					</Typography>
					{performance.length > 0 && (
						<Typography sx={{ fontSize: 12, color: T.ink2 }}>
							{performance.length} positions
						</Typography>
					)}
				</Stack>
				<AccountInvestments currency={currency} />
			</Box>

			{/* Transactions */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: '16px', md: '20px' },
				color: T.ink,
				display: 'flex',
				flexDirection: 'column'
			}}>
				<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 1.5 }}>
					Transactions
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 13 }}> · 거래 내역</Box>
				</Typography>
				<Box sx={{ flex: 1, minHeight: { xs: 480, md: 600 } }}>
					<InvestmentTransactions
						transactions={accountTransactions}
						currency={currency}
					/>
				</Box>
			</Box>

			<InvestmentTransactionModal
				account={account}
				accountId={accountId}
				transactions={accountTransactions}
			/>
		</DesignPage>
	);
}

export default Investment;
