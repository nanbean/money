import React from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import useT from '../../hooks/useT';
import { sDisplay, sMono, fmtCurrencyFull } from '../../utils/designTokens';
import { getCategoryColor } from '../../utils/categoryColor';
import { getCategoryIcon } from '../../utils/categoryIcon';
import { TYPE_ICON_MAP } from '../../constants';

/**
 * 거래 내역을 팝업으로 보여준다. Spending 의 카테고리·거래처 드릴다운과
 * Reports > Expense 의 셀 드릴다운이 같은 모습이 되도록 공용으로 뺐다.
 *
 * 표시만 담당한다 — 어떤 거래를 넘길지, 합계를 어떤 통화로 환산할지는 호출하는 쪽이
 * 정한다. 화면마다 환산 기준(계좌 통화 vs 계좌명)이 달라서 여기서 다루면 어긋난다.
 */
export function TransactionListDialog ({
	open,
	onClose,
	title,
	iconCategory,
	transactions,
	accountCurrencyMap,
	currency,
	total
}) {
	const T = useT();

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				style: {
					background: T.surf,
					color: T.ink,
					border: `1px solid ${T.rule}`,
					borderRadius: 16,
					backgroundImage: 'none'
				}
			}}
		>
			<DialogTitle sx={{ paddingY: 1.5 }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
						{iconCategory && (
							<Box sx={{ color: getCategoryColor(iconCategory) || T.acc.hero, display: 'flex' }}>
								{getCategoryIcon(iconCategory, 20)}
							</Box>
						)}
						<Typography sx={{
							...sDisplay,
							fontSize: 16,
							fontWeight: 700,
							color: T.ink,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						}}>
							{title}
						</Typography>
						<Typography sx={{ fontSize: 12, color: T.ink2, flexShrink: 0 }}>({transactions.length})</Typography>
					</Stack>
					<Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
						{typeof total === 'number' && (
							<Typography sx={{ ...sMono, fontSize: 14, fontWeight: 700, color: T.ink }}>
								{fmtCurrencyFull(total, currency)}
							</Typography>
						)}
						<IconButton size="small" onClick={onClose} sx={{ color: T.ink2 }}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Stack>
				</Stack>
			</DialogTitle>
			<DialogContent sx={{ padding: 0, borderTop: `1px solid ${T.rule}` }}>
				{transactions.length === 0 && (
					<Typography sx={{ fontSize: 13, color: T.ink3, paddingX: 2, paddingY: 2, textAlign: 'center' }}>
						거래 내역이 없습니다
					</Typography>
				)}
				{transactions.map((tx, index) => {
					const type = tx.accountId ? tx.accountId.split(':')[1] : null;
					const TypeIcon = TYPE_ICON_MAP[type];
					const txCur = (accountCurrencyMap && accountCurrencyMap[tx.accountId]) || 'KRW';
					return (
						<Box
							// 분할 거래에서 나온 행은 부모의 _id 를 공유하므로 _id 만으로는
							// 키가 겹친다.
							key={`${tx._id || 'row'}-${index}`}
							sx={{
								display: 'flex',
								alignItems: 'center',
								paddingX: 2,
								paddingY: 1,
								borderBottom: `1px solid ${T.rule}`,
								'&:last-child': { borderBottom: 'none' }
							}}
						>
							<Box sx={{ flex: 1, overflow: 'hidden' }}>
								<Typography sx={{
									fontSize: 13,
									color: T.ink,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{tx.payee || '(none)'}
								</Typography>
								<Stack direction="row" alignItems="center" spacing={0.5} sx={{ marginTop: '2px' }}>
									{TypeIcon && <TypeIcon sx={{ fontSize: 12, color: T.ink3 }} />}
									<Typography sx={{ fontSize: 11, color: T.ink3 }}>
										{tx.account || (tx.accountId ? tx.accountId.split(':')[2] : '')}
									</Typography>
								</Stack>
							</Box>
							<Stack alignItems="flex-end" spacing={0}>
								<Typography sx={{
									...sMono,
									fontSize: 13,
									fontWeight: 600,
									color: tx.amount < 0 ? T.neg : T.pos
								}}>
									{fmtCurrencyFull(tx.amount, txCur)}
								</Typography>
								<Typography sx={{ ...sMono, fontSize: 11, color: T.ink3 }}>{tx.date}</Typography>
							</Stack>
						</Box>
					);
				})}
			</DialogContent>
		</Dialog>
	);
}

TransactionListDialog.propTypes = {
	onClose: PropTypes.func.isRequired,
	open: PropTypes.bool.isRequired,
	transactions: PropTypes.array.isRequired,
	accountCurrencyMap: PropTypes.object,
	currency: PropTypes.string,
	iconCategory: PropTypes.string,
	title: PropTypes.string,
	total: PropTypes.number
};

export default TransactionListDialog;
