import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import useT from '../../hooks/useT';
import { sDisplay, fmtCurrency } from '../../utils/designTokens';
import { TYPE_ICON_MAP, TYPE_NAME_MAP } from '../../constants';

const TYPE_KO = {
	'Bank': '은행',
	'CCard': '신용카드',
	'Cash': '현금',
	'Invst': '투자',
	'Oth L': '대출',
	'Oth A': '자산'
};

export default function HomeAccountsGrid () {
	const T = useT();

	const accountList = useSelector((state) => state.accountList);

	const accounts = useMemo(() => {
		const filtered = (accountList || []).filter(a => !a.closed && !a.name.match(/_Cash/i));
		const sorted = [...filtered].sort((a, b) => Math.abs(b.balance || 0) - Math.abs(a.balance || 0));
		return sorted.slice(0, 8);
	}, [accountList]);

	if (accounts.length === 0) return null;

	return (
		<Box sx={{ marginBottom: '20px' }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ margin: '12px 4px' }}>
				<Typography sx={{ ...sDisplay, fontSize: 22, fontWeight: 700, color: T.ink, margin: 0 }}>
					Accounts
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400 }}> · 계좌</Box>
				</Typography>
			</Stack>
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
				gap: 2
			}}>
				{accounts.map(a => {
					const IconComponent = TYPE_ICON_MAP[a.type];
					const balance = Number(a.balance) || 0;
					return (
						<Link key={a._id || a.name} to={`/${a.type}/${a.name}`} style={{ textDecoration: 'none' }}>
							<Box sx={{
								background: T.surf,
								border: `1px solid ${T.rule}`,
								borderRadius: '16px',
								padding: { xs: '14px', md: '18px' },
								color: T.ink,
								cursor: 'pointer',
								transition: 'transform 0.12s, border-color 0.12s',
								'&:hover': {
									transform: 'translateY(-2px)',
									borderColor: T.acc.bright
								}
							}}>
								<Stack direction="row" alignItems="center" spacing={0.75} sx={{ fontSize: 11, color: T.ink2 }}>
									<Box sx={{
										width: 22,
										height: 22,
										background: T.acc.bg,
										color: T.acc.deep,
										borderRadius: '6px',
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0
									}}>
										{IconComponent && <IconComponent sx={{ fontSize: 12 }} />}
									</Box>
									<Typography sx={{ fontSize: 11, fontWeight: 500, color: T.ink2 }}>
										{TYPE_NAME_MAP[a.type]} · {TYPE_KO[a.type] || ''}
									</Typography>
								</Stack>
								<Typography sx={{
									fontSize: 12,
									fontWeight: 500,
									marginTop: '12px',
									color: T.ink,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{a.name}
								</Typography>
								<Typography sx={{
									...sDisplay,
									fontSize: 22,
									fontWeight: 700,
									marginTop: '10px',
									color: balance < 0 ? T.neg : T.ink,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{fmtCurrency(balance, a.currency || 'KRW')}
								</Typography>
							</Box>
						</Link>
					);
				})}
			</Box>
		</Box>
	);
}
