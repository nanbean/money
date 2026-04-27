import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import moment from 'moment';
import _ from 'lodash';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtCurrency } from '../../utils/designTokens';

import { YEAR_LIST } from '../../constants';

export function AmexTracker () {
	const T = useT();
	const lab = labelStyle(T);

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [year, setYear] = useState(parseInt(moment().format('YYYY'), 10));
	const [expandedPayees, setExpandedPayees] = useState([]);

	const onYearChange = (event) => {
		setYear(event.target.value);
		setExpandedPayees([]);
	};

	const handlePayeeToggle = (payee) => {
		setExpandedPayees(prev =>
			prev.includes(payee) ? prev.filter(p => p !== payee) : [...prev, payee]);
	};

	const startDate = moment().year(year).startOf('year').format('YYYY-MM-DD');
	const endDate = moment().year(year).endOf('year').format('YYYY-MM-DD');
	const creditTransactions = allAccountsTransactions
		.filter(i => i.memo?.includes('credit:'))
		.filter(i => i.date >= startDate && i.date <= endDate);

	const getCreditValue = (memo) => {
		if (!memo) return 0;
		const creditValueString = memo.split('credit:')[1];
		const creditValue = parseFloat(creditValueString);
		return isNaN(creditValue) ? 0 : creditValue;
	};

	const totalCredit = creditTransactions.reduce((acc, curr) => acc + getCreditValue(curr.memo), 0);

	const creditsByPayee = _.reduce(creditTransactions, (result, transaction) => {
		const payee = transaction.payee;
		result[payee] = (result[payee] || 0) + getCreditValue(transaction.memo);
		return result;
	}, {});

	const transactionsByPayee = _.groupBy(creditTransactions, 'payee');
	const sortedPayees = Object.entries(transactionsByPayee).sort(
		([a], [b]) => (creditsByPayee[b] || 0) - (creditsByPayee[a] || 0)
	);
	const payeeCount = sortedPayees.length;

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	const yearSelectSx = {
		minWidth: 140,
		'& .MuiOutlinedInput-root': {
			background: T.bg,
			borderRadius: '8px',
			fontSize: 13,
			color: T.ink,
			height: 36
		},
		'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
		'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero },
		'& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero }
	};

	return (
		<Stack spacing={2}>
			{/* Hero summary panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
					<Box>
						<Typography sx={{
							fontSize: 11,
							color: T.ink3,
							textTransform: 'uppercase',
							letterSpacing: '0.08em',
							fontWeight: 600
						}}>
							Amex credits · 카드 크레딧
						</Typography>
						<Typography sx={{
							...sDisplay,
							fontSize: { xs: 28, md: 36 },
							fontWeight: 700,
							marginTop: '6px',
							color: T.ink,
							lineHeight: 1
						}}>
							{fmtCurrency(totalCredit, 'USD')}
						</Typography>
						<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: '8px' }}>
							{year} · {payeeCount} merchant{payeeCount === 1 ? '' : 's'} · {creditTransactions.length} transactions
						</Typography>
					</Box>
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography sx={lab}>Year</Typography>
						<FormControl size="small" sx={yearSelectSx}>
							<Select
								value={year}
								onChange={onYearChange}
								MenuProps={{
									PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } }
								}}
							>
								{YEAR_LIST.map(i => (
									<MenuItem key={i.key} value={i.value}>{i.text}</MenuItem>
								))}
							</Select>
						</FormControl>
					</Stack>
				</Stack>
			</Box>

			{/* Credits by merchant table panel */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ marginBottom: 1.5 }}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
						By merchant
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 가맹점별</Box>
					</Typography>
					<Typography sx={{ fontSize: 11, color: T.ink3 }}>
						Click a row to expand
					</Typography>
				</Stack>

				{sortedPayees.length === 0 ? (
					<Box sx={{ padding: 4, textAlign: 'center' }}>
						<Typography sx={{ fontSize: 13, color: T.ink2 }}>No credits in {year}</Typography>
					</Box>
				) : (
					<Box sx={{ border: `1px solid ${T.rule}`, borderRadius: '12px', overflow: 'hidden' }}>
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: '1fr auto',
							gap: 2,
							padding: '10px 14px',
							background: T.dark ? '#15151c' : '#f5f5fa',
							fontSize: 11,
							color: T.ink2,
							fontWeight: 600,
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
							borderBottom: `1px solid ${T.rule}`
						}}>
							<Box>Merchant</Box>
							<Box sx={{ textAlign: 'right' }}>Total</Box>
						</Box>
						{sortedPayees.map(([payee, transactions]) => {
							const totalForPayee = creditsByPayee[payee] || 0;
							const isExpanded = expandedPayees.includes(payee);
							return (
								<React.Fragment key={payee}>
									<Box
										onClick={() => handlePayeeToggle(payee)}
										sx={{
											display: 'grid',
											gridTemplateColumns: '1fr auto',
											gap: 2,
											padding: '12px 14px',
											alignItems: 'center',
											background: T.surf,
											borderTop: `1px solid ${T.rule}`,
											cursor: 'pointer',
											'&:hover': { background: T.surf2 }
										}}
									>
										<Stack direction="row" alignItems="center" spacing={0.75}>
											<IconButton size="small" sx={{ color: T.ink2, padding: '2px' }}>
												{isExpanded ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
											</IconButton>
											<Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
												{payee}
											</Typography>
											<Box sx={{
												padding: '2px 8px',
												fontSize: 11,
												fontWeight: 600,
												borderRadius: '999px',
												background: T.acc.bg,
												color: T.acc.deep
											}}>
												{transactions.length}
											</Box>
										</Stack>
										<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: T.ink, textAlign: 'right' }}>
											{fmtCurrency(totalForPayee, 'USD')}
										</Typography>
									</Box>
									{isExpanded && transactions.map((tx) => (
										<Box
											key={tx._id || `${tx.date}-${tx.payee}-${tx.amount}`}
											sx={{
												display: 'grid',
												gridTemplateColumns: '1fr auto',
												gap: 2,
												padding: '8px 14px 8px 46px',
												alignItems: 'center',
												background: T.dark ? 'rgba(255,255,255,0.02)' : T.surf2,
												borderTop: `1px solid ${T.rule}`
											}}
										>
											<Typography sx={{ ...sMono, fontSize: 12, color: T.ink2 }}>
												{tx.date}
											</Typography>
											<Typography sx={{ ...sMono, fontSize: 12, color: T.ink, textAlign: 'right' }}>
												{fmtCurrency(getCreditValue(tx.memo), 'USD')}
											</Typography>
										</Box>
									))}
								</React.Fragment>
							);
						})}
						{/* Footer total row */}
						<Box sx={{
							display: 'grid',
							gridTemplateColumns: '1fr auto',
							gap: 2,
							padding: '12px 14px',
							alignItems: 'center',
							background: T.dark ? '#15151c' : '#f5f5fa',
							borderTop: `1px solid ${T.rule}`
						}}>
							<Typography sx={{ fontSize: 11, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
								Total
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 14, fontWeight: 700, color: T.ink, textAlign: 'right' }}>
								{fmtCurrency(totalCredit, 'USD')}
							</Typography>
						</Box>
					</Box>
				)}
			</Box>
		</Stack>
	);
}

export default AmexTracker;
