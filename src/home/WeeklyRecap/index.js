import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';

export const getISOWeekKey = () => {
	const now = new Date();
	const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
	const day = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const DISMISS_KEY = 'weeklyRecap_dismissed';

export function WeeklyRecap ({ onDismiss }) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [recap, setRecap] = useState('');
	const [error, setError] = useState('');

	const fetchRecap = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await fetch('/api/weeklyRecap');
			if (!res.ok) throw new Error('서버 오류가 발생했습니다.');
			const data = await res.json();
			setRecap(data.comment || '');
		} catch (err) {
			setError(err.message || '분석 중 오류가 발생했습니다.');
		} finally {
			setLoading(false);
		}
	};

	const handleOpen = () => {
		setOpen(true);
		if (!recap) fetchRecap();
	};

	const handleClose = () => {
		setOpen(false);
	};

	return (
		<Box p={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ml: 1, mb: 1 }}>
				<Typography variant="button">Weekly Recap</Typography>
				<IconButton size="small" onClick={onDismiss}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Stack>
			<Stack alignItems="center" justifyContent="center" sx={{ py: 2 }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
					AI의 이번 주 자산 변동 분석 결과를 확인해 보세요!
				</Typography>
				<Button
					variant="contained"
					startIcon={<AutoAwesomeIcon />}
					onClick={handleOpen}
					size="small"
				>
					주간 분석 보기
				</Button>
			</Stack>

			<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Stack direction="row" alignItems="center" spacing={1}>
							<AutoAwesomeIcon fontSize="small" color="primary" />
							<Typography variant="h6">Weekly Recap</Typography>
						</Stack>
						<IconButton size="small" onClick={handleClose}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent dividers>
					{loading && (
						<Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
							<CircularProgress size={32} />
							<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
								AI가 분석 중입니다...
							</Typography>
						</Stack>
					)}
					{!loading && error && (
						<Typography color="error" variant="body2">
							{error}
						</Typography>
					)}
					{!loading && recap && (
						<Typography
							variant="body2"
							component="pre"
							sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0, lineHeight: 1.8 }}
						>
							{recap}
						</Typography>
					)}
				</DialogContent>
			</Dialog>
		</Box>
	);
}

export default WeeklyRecap;
