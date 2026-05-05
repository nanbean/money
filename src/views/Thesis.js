import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import DesignPage from '../components/DesignPage';
import useT from '../hooks/useT';
import { sDisplay, sMono } from '../utils/designTokens';
import { getThesesAction, addReviewAction, deleteReviewAction } from '../actions/thesesActions';

const SCORES = [
	{ id: 'strengthening', label: 'Strengthening', tone: 'pos', short: '↑' },
	{ id: 'on-track', label: 'On-track', tone: 'neutral', short: '=' },
	{ id: 'weakening', label: 'Weakening', tone: 'warn', short: '↓' },
	{ id: 'broken', label: 'Broken', tone: 'neg', short: '✕' }
];
const SCORE_BY_ID = Object.fromEntries(SCORES.map(s => [s.id, s]));

const toneStyle = (T, tone, dim = false) => {
	const map = {
		pos: { fg: T.pos, bg: T.posBg },
		neutral: { fg: T.acc.hero, bg: T.dark ? 'rgba(96,165,250,0.18)' : 'rgba(59,130,246,0.12)' },
		warn: { fg: T.dark ? '#fbbf24' : '#b45309', bg: T.dark ? 'rgba(251,191,36,0.18)' : 'rgba(245,158,11,0.14)' },
		neg: { fg: T.neg, bg: T.negBg }
	};
	const style = map[tone] || map.neutral;
	if (dim) return { color: style.fg, background: 'transparent', border: `1px solid ${style.fg}33` };
	return { color: style.fg, background: style.bg };
};

const daysBetween = (a, b) => Math.floor((new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000));
const todayStr = () => new Date().toISOString().slice(0, 10);

function ScoreChip ({ scoreId, T, dim = false, size = 'sm' }) {
	if (!scoreId) return null;
	const score = SCORE_BY_ID[scoreId];
	if (!score) return null;
	const ts = toneStyle(T, score.tone, dim);
	return (
		<Box sx={{
			...ts,
			display: 'inline-flex',
			alignItems: 'center',
			gap: 0.5,
			padding: size === 'lg' ? '4px 10px' : '2px 8px',
			borderRadius: '999px',
			fontSize: size === 'lg' ? 12 : 11,
			fontWeight: 700,
			letterSpacing: '0.02em'
		}}>
			<span style={{ ...sMono, fontSize: size === 'lg' ? 12 : 10 }}>{score.short}</span>
			{score.label}
		</Box>
	);
}
ScoreChip.propTypes = { dim: PropTypes.bool, scoreId: PropTypes.string, size: PropTypes.string, T: PropTypes.object };

function MiniScoreHistory ({ reviews, T }) {
	const last = (reviews || []).slice(-4);
	if (last.length === 0) return null;
	return (
		<Stack direction="row" spacing={0.5}>
			{last.map((r, i) => {
				const score = SCORE_BY_ID[r.score];
				const ts = score ? toneStyle(T, score.tone) : { background: T.rule };
				return (
					<Tooltip key={r.id || i} title={`${r.date} · ${score?.label || r.score}`}>
						<Box sx={{ width: 14, height: 6, borderRadius: '2px', background: ts.color || ts.background }} />
					</Tooltip>
				);
			})}
		</Stack>
	);
}
MiniScoreHistory.propTypes = { reviews: PropTypes.array, T: PropTypes.object };

function AddReviewDialog ({ open, onClose, onSubmit, thesis, defaultPillarId, T }) {
	const [pillarId, setPillarId] = useState(defaultPillarId || '');
	const [scoreId, setScoreId] = useState('on-track');
	const [date, setDate] = useState(todayStr());
	const [note, setNote] = useState('');
	const [sourcesText, setSourcesText] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) {
			setPillarId(defaultPillarId || (thesis?.pillars?.[0]?.id) || '');
			setScoreId('on-track');
			setDate(todayStr());
			setNote('');
			setSourcesText('');
		}
	}, [open, defaultPillarId, thesis]);

	const submit = async () => {
		if (!pillarId || !scoreId) return;
		setSubmitting(true);
		try {
			const sources = sourcesText.split('\n').map(s => s.trim()).filter(Boolean);
			await onSubmit({ pillarId, score: scoreId, date, note: note.trim(), sources });
			onClose();
		} finally {
			setSubmitting(false);
		}
	};

	if (!thesis) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
			PaperProps={{ style: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}`, borderRadius: 16, backgroundImage: 'none' } }}>
			<DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, color: T.ink }}>
					Add review · {thesis.ticker}
				</Typography>
				<IconButton size="small" onClick={onClose} sx={{ color: T.ink2 }}><CloseIcon fontSize="small"/></IconButton>
			</DialogTitle>
			<DialogContent sx={{ borderTop: `1px solid ${T.rule}`, paddingTop: 2 }}>
				<Stack spacing={2}>
					<TextField select fullWidth size="small" label="Pillar" value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
						{(thesis.pillars || []).map(p => (
							<MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
						))}
					</TextField>
					<Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
						{SCORES.map(s => {
							const active = scoreId === s.id;
							const ts = toneStyle(T, s.tone, !active);
							return (
								<Box key={s.id} onClick={() => setScoreId(s.id)} sx={{
									...ts,
									cursor: 'pointer',
									padding: '6px 12px',
									borderRadius: '999px',
									fontSize: 12,
									fontWeight: 700,
									userSelect: 'none'
								}}>
									{s.short} {s.label}
								</Box>
							);
						})}
					</Stack>
					<TextField type="date" size="small" label="Date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
					<TextField multiline minRows={3} maxRows={10} fullWidth size="small" label="Note" placeholder="What changed? Evidence and reasoning." value={note} onChange={(e) => setNote(e.target.value)} />
					<TextField multiline minRows={2} maxRows={6} fullWidth size="small" label="Sources (one URL per line)" value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} />
				</Stack>
			</DialogContent>
			<DialogActions sx={{ padding: 2 }}>
				<Button onClick={onClose} sx={{ color: T.ink2 }}>Cancel</Button>
				<Button onClick={submit} disabled={submitting || !pillarId || !scoreId} variant="contained" sx={{ background: T.acc.hero, '&:hover': { background: T.acc.deep } }}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
AddReviewDialog.propTypes = {
	defaultPillarId: PropTypes.string, onClose: PropTypes.func, onSubmit: PropTypes.func,
	open: PropTypes.bool, T: PropTypes.object, thesis: PropTypes.object
};

function PillarCard ({ pillar, reviews, T, onAddReview }) {
	const pillarReviews = (reviews || []).filter(r => r.pillarId === pillar.id).sort((a, b) => a.date.localeCompare(b.date));
	const latest = pillarReviews[pillarReviews.length - 1];
	const since = latest ? daysBetween(todayStr(), latest.date) : null;

	return (
		<Box sx={{
			background: T.surf,
			border: `1px solid ${T.rule}`,
			borderRadius: '16px',
			padding: 2,
			display: 'flex',
			flexDirection: 'column',
			gap: 1,
			minHeight: 160
		}}>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>
						{pillar.label}
					</Typography>
					{pillar.description && (
						<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: 0.5, lineHeight: 1.4 }}>
							{pillar.description}
						</Typography>
					)}
				</Box>
				<IconButton size="small" onClick={() => onAddReview(pillar.id)} sx={{ color: T.ink2, flexShrink: 0 }}>
					<AddIcon fontSize="small"/>
				</IconButton>
			</Stack>

			<Box sx={{ flex: 1 }}/>

			<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
				{latest ? <ScoreChip scoreId={latest.score} T={T} size="lg"/> : <Typography sx={{ fontSize: 11, color: T.ink3 }}>No reviews yet</Typography>}
				<MiniScoreHistory reviews={pillarReviews} T={T}/>
			</Stack>

			{latest && (
				<Box sx={{ marginTop: 0.5 }}>
					<Typography sx={{ ...sMono, fontSize: 10, color: T.ink3 }}>
						{latest.date} · {since}d ago
					</Typography>
					{latest.note && (
						<Typography sx={{ fontSize: 12, color: T.ink2, marginTop: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
							{latest.note}
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);
}
PillarCard.propTypes = {
	onAddReview: PropTypes.func,
	pillar: PropTypes.object,
	reviews: PropTypes.array,
	T: PropTypes.object
};

function ReviewTimeline ({ thesis, T, onDelete }) {
	const reviews = (thesis.reviews || []).slice().sort((a, b) => b.date.localeCompare(a.date));
	const pillarMap = Object.fromEntries((thesis.pillars || []).map(p => [p.id, p]));
	if (reviews.length === 0) {
		return (
			<Typography sx={{ fontSize: 12, color: T.ink3, padding: 2, textAlign: 'center' }}>
				리뷰가 아직 없습니다. 우측의 + 버튼으로 첫 리뷰를 추가해 보세요.
			</Typography>
		);
	}
	return (
		<Stack divider={<Box sx={{ borderTop: `1px solid ${T.rule}` }}/>}>
			{reviews.map(r => (
				<Box key={r.id} sx={{ padding: '12px 4px', display: 'flex', gap: 1.5 }}>
					<Box sx={{ minWidth: 88 }}>
						<Typography sx={{ ...sMono, fontSize: 11, color: T.ink2 }}>{r.date}</Typography>
					</Box>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ marginBottom: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
							<ScoreChip scoreId={r.score} T={T}/>
							<Typography sx={{ fontSize: 12, color: T.ink2 }}>{pillarMap[r.pillarId]?.label || r.pillarId}</Typography>
						</Stack>
						{r.note && (
							<Typography sx={{ fontSize: 13, color: T.ink, whiteSpace: 'pre-wrap' }}>
								{r.note}
							</Typography>
						)}
						{Array.isArray(r.sources) && r.sources.length > 0 && (
							<Stack direction="row" spacing={1} sx={{ marginTop: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
								{r.sources.map((src, i) => (
									<Box key={i} component="a" href={src} target="_blank" rel="noopener noreferrer" sx={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: 0.4,
										fontSize: 11,
										color: T.acc.hero,
										textDecoration: 'none',
										'&:hover': { textDecoration: 'underline' }
									}}>
										<OpenInNewIcon sx={{ fontSize: 11 }}/>
										{(() => { try { return new URL(src).hostname.replace(/^www\./, ''); } catch (e) { return src; } })()}
									</Box>
								))}
							</Stack>
						)}
					</Box>
					<IconButton size="small" onClick={() => onDelete(r.id)} sx={{ color: T.ink3, alignSelf: 'flex-start' }}>
						<DeleteOutlineIcon fontSize="small"/>
					</IconButton>
				</Box>
			))}
		</Stack>
	);
}
ReviewTimeline.propTypes = { onDelete: PropTypes.func, T: PropTypes.object, thesis: PropTypes.object };

function ThesisCard ({ thesis, T, onAddReview, onDeleteReview }) {
	const reviews = thesis.reviews || [];
	const interval = thesis.reviewIntervalDays || 90;
	const lastReviewDate = useMemo(() => reviews.reduce((max, r) => (r.date > max ? r.date : max), ''), [reviews]);
	const sinceLast = lastReviewDate ? daysBetween(todayStr(), lastReviewDate) : null;
	const dueIn = sinceLast === null ? null : interval - sinceLast;
	const overdue = dueIn !== null && dueIn <= 0;

	const cadenceColor = sinceLast === null
		? T.ink3
		: overdue ? T.neg : (dueIn <= 14 ? (T.dark ? '#fbbf24' : '#b45309') : T.pos);

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: { xs: 2, md: 2.5 }
			}}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} flexWrap="wrap" rowGap={1}>
					<Box>
						<Stack direction="row" alignItems="center" spacing={1.5}>
							<Box sx={{
								background: T.acc.hero,
								color: '#fff',
								padding: '4px 10px',
								borderRadius: '8px',
								fontSize: 12,
								fontWeight: 800,
								letterSpacing: '0.06em',
								...sMono
							}}>
								{thesis.ticker}
							</Box>
							<Typography sx={{ ...sDisplay, fontSize: 18, fontWeight: 700, color: T.ink }}>
								{thesis.title}
							</Typography>
						</Stack>
						<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>
							{thesis.pillars?.length || 0} pillars · review every {interval} days
						</Typography>
					</Box>

					<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1}>
						<Box sx={{ textAlign: 'right' }}>
							<Typography sx={{ fontSize: 10, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
								Last review
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 13, color: T.ink }}>
								{sinceLast === null ? '—' : `${sinceLast}d ago`}
							</Typography>
						</Box>
						<Box sx={{ textAlign: 'right' }}>
							<Typography sx={{ fontSize: 10, color: T.ink3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
								Next due
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 13, color: cadenceColor, fontWeight: 700 }}>
								{dueIn === null ? '—' : (overdue ? `overdue ${-dueIn}d` : `in ${dueIn}d`)}
							</Typography>
						</Box>
						<Button onClick={() => onAddReview(null)} variant="contained" startIcon={<AddIcon/>} sx={{ background: T.acc.hero, '&:hover': { background: T.acc.deep } }}>
							Add review
						</Button>
					</Stack>
				</Stack>
			</Box>

			{/* Pillars */}
			<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
				{(thesis.pillars || []).map(p => (
					<PillarCard key={p.id} pillar={p} reviews={reviews} T={T} onAddReview={onAddReview}/>
				))}
			</Box>

			{/* Timeline */}
			<Box sx={{
				background: T.surf,
				border: `1px solid ${T.rule}`,
				borderRadius: '16px',
				padding: 2
			}}>
				<Typography sx={{ ...sDisplay, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1 }}>
					Review timeline
				</Typography>
				<ReviewTimeline thesis={thesis} T={T} onDelete={onDeleteReview}/>
			</Box>
		</Stack>
	);
}
ThesisCard.propTypes = {
	onAddReview: PropTypes.func,
	onDeleteReview: PropTypes.func,
	T: PropTypes.object,
	thesis: PropTypes.object
};

function Thesis () {
	const T = useT();
	const dispatch = useDispatch();
	const theses = useSelector((s) => s.theses || []);

	const [activeId, setActiveId] = useState(null);
	const [dialog, setDialog] = useState(null); // { thesisId, defaultPillarId }

	useEffect(() => {
		dispatch(getThesesAction());
	}, [dispatch]);

	useEffect(() => {
		if (!activeId && theses.length > 0) setActiveId(theses[0]._id);
	}, [theses, activeId]);

	const active = theses.find(t => t._id === activeId) || theses[0];

	const handleAddReview = (defaultPillarId) => {
		if (!active) return;
		setDialog({ thesisId: active._id, defaultPillarId });
	};
	const handleDeleteReview = async (reviewId) => {
		if (!active) return;
		if (!window.confirm('이 리뷰를 삭제할까요?')) return;
		try {
			await dispatch(deleteReviewAction(active._id, reviewId));
		} catch (err) {
			console.log('delete review failed:', err); // eslint-disable-line no-console
		}
	};
	const handleSubmit = async (review) => {
		if (!dialog) return;
		try {
			await dispatch(addReviewAction(dialog.thesisId, review));
		} catch (err) {
			console.log('add review failed:', err); // eslint-disable-line no-console
		}
	};

	return (
		<DesignPage title="Thesis" titleKo="투자 가설">
			{theses.length > 1 && (
				<Stack direction="row" spacing={1} sx={{ marginBottom: 2, flexWrap: 'wrap', rowGap: 1 }}>
					{theses.map(t => {
						const isActive = active && t._id === active._id;
						return (
							<Box key={t._id} onClick={() => setActiveId(t._id)} sx={{
								cursor: 'pointer',
								padding: '6px 12px',
								borderRadius: '999px',
								fontSize: 12,
								fontWeight: 700,
								background: isActive ? T.acc.hero : 'transparent',
								color: isActive ? '#fff' : T.ink2,
								border: `1px solid ${isActive ? T.acc.hero : T.rule}`,
								...sMono
							}}>
								{t.ticker}
							</Box>
						);
					})}
				</Stack>
			)}

			{active ? (
				<ThesisCard thesis={active} T={T} onAddReview={handleAddReview} onDeleteReview={handleDeleteReview}/>
			) : (
				<Box sx={{
					background: T.surf,
					border: `1px solid ${T.rule}`,
					borderRadius: '16px',
					padding: 4,
					textAlign: 'center'
				}}>
					<Typography sx={{ fontSize: 14, color: T.ink2 }}>
						아직 등록된 thesis가 없습니다.
					</Typography>
					<Typography sx={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>
						서버에서{' '}
						<Box component="span" sx={{ ...sMono, color: T.ink2 }}>
							node server/tools/seedTslaThesis.js
						</Box>
						{' '}를 한 번 실행하면 TSLA thesis가 시드됩니다.
					</Typography>
				</Box>
			)}

			<AddReviewDialog
				open={!!dialog}
				thesis={active}
				defaultPillarId={dialog?.defaultPillarId}
				onClose={() => setDialog(null)}
				onSubmit={handleSubmit}
				T={T}
			/>
		</DesignPage>
	);
}

export default Thesis;
