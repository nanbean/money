import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DesignPage from '../components/DesignPage';
import useT from '../hooks/useT';
import { sDisplay, sMono, fmtCurrency } from '../utils/designTokens';
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

	const { groups, totalAccounts } = useMemo(() => {
		const validRate = (typeof exchangeRate === 'number' && exchangeRate > 0) ? exchangeRate : 1;
		const filtered = (accountList || []).filter(a => !a.closed && !a.name.match(/_Cash/i));

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
			return acc;
		}, {});

		// Sort accounts within each group by absolute balance, descending
		Object.values(grouped).forEach(g => {
			g.accounts.sort((a, b) => Math.abs(Number(b.balance) || 0) - Math.abs(Number(a.balance) || 0));
		});

		const ordered = TYPE_ORDER
			.filter(t => grouped[t])
			.map(t => [t, grouped[t]]);

		return { groups: ordered, totalAccounts: filtered.length };
	}, [accountList, exchangeRate, currency]);

	if (accountList.length === 0) {
		return <DesignPage title="Accounts" titleKo="계좌" loading />;
	}

	const subtitle = `${totalAccounts} accounts across ${groups.length} types`;

	return (
		<DesignPage title="Accounts" titleKo="계좌" subtitle={subtitle}>
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
												{fmtCurrency(balance, a.currency || currency)}
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
