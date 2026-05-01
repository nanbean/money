import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DesignPage from '../components/DesignPage';
import useT from '../hooks/useT';
import { sDisplay, sMono, fmtCurrency, fmtCurrencyFull } from '../utils/designTokens';
import { TYPE_ICON_MAP, TYPE_NAME_MAP, BANK_TYPE, INVEST_TYPE } from '../constants';

const TYPE_KO = {
	'Bank': '은행',
	'CCard': '신용카드',
	'Cash': '현금',
	'Invst': '투자',
	'Oth A': '부동산·실물',
	'Oth L': '부채'
};

const TYPE_ORDER = ['Bank', 'CCard', 'Cash', 'Invst', 'Oth A', 'Oth L'];

export function Accounts () {
	const T = useT();

	const accountList = useSelector((state) => state.accountList);
	const { exchangeRate, currency = 'KRW' } = useSelector((state) => state.settings || {});

	const { groups, totalAccounts, totalAssets, totalLiabilities, netWorth } = useMemo(() => {
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
		const filtered = (accountList || []).filter(a => !a.closed && !a.name.match(/_Cash/i));

		let assets = 0;
		let liab = 0;

		const grouped = filtered.reduce((acc, a) => {
			const t = a.type || 'Other';
			if (!acc[t]) acc[t] = { accounts: [], total: 0 };
			acc[t].accounts.push(a);
			const accCur = a.currency || 'KRW';
			const bal = Number(a.balance) || 0;
			let display = bal;
			if (accCur !== currency) {
				if (accCur === 'KRW') display = bal / validRate;
				else display = bal * validRate;
			}
			acc[t].total += display;
			if (display >= 0) assets += display;
			else liab += display;
			return acc;
		}, {});

		// Sort accounts within each group by absolute balance, descending
		Object.values(grouped).forEach(g => {
			g.accounts.sort((a, b) => Math.abs(Number(b.balance) || 0) - Math.abs(Number(a.balance) || 0));
		});

		const ordered = TYPE_ORDER
			.filter(t => grouped[t])
			.map(t => [t, grouped[t]]);

		return {
			groups: ordered,
			totalAccounts: filtered.length,
			totalAssets: assets,
			totalLiabilities: Math.abs(liab),
			netWorth: assets + liab
		};
	}, [accountList, exchangeRate, currency]);

	if (accountList.length === 0) {
		return <DesignPage title="Accounts" titleKo="계좌" loading />;
	}

	const subtitle = `${totalAccounts} accounts across ${groups.length} types`;

	const heroBg = T.dark
		? 'linear-gradient(135deg, #15151c 0%, #1d1d26 100%)'
		: `linear-gradient(135deg, ${T.acc.hero} 0%, ${T.acc.deep} 100%)`;
	const heroInk = '#ffffff';
	const heroDim = T.dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)';
	const heroDivider = T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)';

	const heroStats = [
		{ label: 'Liabilities · 부채', value: fmtCurrency(totalLiabilities, currency), color: totalLiabilities > 0 ? '#fb7185' : heroInk, divider: false },
		{ label: 'Net worth · 순자산', value: fmtCurrency(netWorth, currency), color: netWorth < 0 ? '#fb7185' : heroInk, divider: true },
		{ label: 'Accounts · 계좌 수', value: String(totalAccounts), color: heroInk, divider: true }
	];

	return (
		<DesignPage title="Accounts" titleKo="계좌" subtitle={subtitle}>
			{/* Hero panel */}
			<Box sx={{
				position: 'relative',
				overflow: 'hidden',
				background: heroBg,
				borderRadius: '20px',
				padding: { xs: '20px', md: '28px' },
				color: heroInk,
				marginBottom: '20px'
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
						Total assets · 총자산
					</Typography>
					<Typography sx={{
						...sDisplay,
						fontSize: { xs: 32, sm: 42, md: 52 },
						fontWeight: 700,
						lineHeight: 1,
						marginTop: '12px',
						color: heroInk,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					}}>
						{fmtCurrency(totalAssets, currency)}
					</Typography>
				</Box>
				<Box sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(3, 1fr)' },
					gap: { xs: 1.5, md: 3 },
					marginTop: { xs: '20px', md: '28px' },
					position: 'relative'
				}}>
					{heroStats.map((s) => (
						<Box key={s.label} sx={{
							borderLeft: { xs: 'none', md: s.divider ? `1px solid ${heroDivider}` : 'none' },
							paddingLeft: { xs: 0, md: s.divider ? '24px' : 0 },
							minWidth: 0
						}}>
							<Typography sx={{
								fontSize: 11,
								color: heroDim,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
								fontWeight: 500
							}}>
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
						</Box>
					))}
				</Box>
			</Box>

			{/* Type summary cards */}
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
				gap: 2,
				marginBottom: '20px'
			}}>
				{groups.map(([type, data]) => {
					const Icon = TYPE_ICON_MAP[type];
					return (
						<Box key={type} sx={{
							background: T.surf,
							border: `1px solid ${T.rule}`,
							borderRadius: '16px',
							padding: { xs: '16px', md: '20px' },
							color: T.ink
						}}>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Box sx={{
									width: 28,
									height: 28,
									borderRadius: '8px',
									background: T.acc.bg,
									color: T.acc.deep,
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0
								}}>
									{Icon && <Icon sx={{ fontSize: 14 }} />}
								</Box>
								<Typography sx={{ fontSize: 12, color: T.ink2, fontWeight: 500 }}>
									{TYPE_NAME_MAP[type] || type} · {data.accounts.length}
								</Typography>
							</Stack>
							<Typography sx={{
								...sDisplay,
								fontSize: 22,
								fontWeight: 700,
								marginTop: '10px',
								color: data.total < 0 ? T.neg : T.ink,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap'
							}}>
								{fmtCurrency(data.total, currency)}
							</Typography>
						</Box>
					);
				})}
			</Box>

			{/* Per-type sections */}
			<Stack spacing={2}>
				{groups.map(([type, data]) => {
					const Icon = TYPE_ICON_MAP[type];
					return (
						<Box key={type} sx={{
							background: T.surf,
							border: `1px solid ${T.rule}`,
							borderRadius: '16px',
							padding: { xs: '16px', md: '20px' },
							color: T.ink
						}}>
							<Stack direction="row" alignItems="baseline" spacing={1}>
								<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>
									{TYPE_NAME_MAP[type] || type}
								</Typography>
								<Typography sx={{ fontSize: 14, color: T.ink2, fontWeight: 400 }}>
									· {TYPE_KO[type] || ''}
								</Typography>
							</Stack>
							<Box sx={{ marginTop: 1.5 }}>
								{data.accounts.map((a, i) => {
									const balance = Number(a.balance) || 0;
									const isInvst = INVEST_TYPE.includes(a.type);
									const linkBase = BANK_TYPE.includes(a.type) || isInvst ? `/${a.type}/${a.name}` : null;
									const row = (
										<Box sx={{
											display: 'grid',
											gridTemplateColumns: '36px 1fr auto',
											gap: 2,
											alignItems: 'center',
											padding: '14px 0',
											borderTop: `1px solid ${T.rule}`,
											cursor: linkBase ? 'pointer' : 'default',
											'&:hover': linkBase ? { background: T.surf2 } : undefined
										}}>
											<Box sx={{
												width: 36,
												height: 36,
												borderRadius: '10px',
												background: T.acc.bg,
												color: T.acc.deep,
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												flexShrink: 0
											}}>
												{Icon && <Icon sx={{ fontSize: 16 }} />}
											</Box>
											<Box sx={{ minWidth: 0 }}>
												<Typography sx={{
													fontSize: 14,
													fontWeight: 600,
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
													color: T.ink
												}}>
													{a.name}
												</Typography>
												<Typography sx={{ fontSize: 11, color: T.ink2 }}>
													{a.currency || 'KRW'}
												</Typography>
											</Box>
											<Typography sx={{
												...sMono,
												fontSize: 16,
												fontWeight: 600,
												color: balance < 0 ? T.neg : T.ink,
												textAlign: 'right'
											}}>
												{fmtCurrencyFull(balance, a.currency || currency)}
											</Typography>
										</Box>
									);
									return linkBase ? (
										<Link key={a._id || a.name} to={linkBase} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
											{i === 0 && <Box sx={{ borderTop: 'none' }} />}
											{row}
										</Link>
									) : (
										<Box key={a._id || a.name}>{row}</Box>
									);
								})}
							</Box>
						</Box>
					);
				})}
			</Stack>
		</DesignPage>
	);
}

export default Accounts;
