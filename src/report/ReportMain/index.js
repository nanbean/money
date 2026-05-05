import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import DesignPage from '../../components/DesignPage';
import MonthlyExpense from '../MonthlyExpense';
import Dividend from '../Dividend';
import FamilyGifts from '../FamilyGifts';
import InvestmentHistory from '../InvestmentHistory';
import InvestmentPortfolio from '../InvestmentPortfolio';
import RateOfReturn from '../RateOfReturn';
import AmexTracker from '../AmexTracker';
import { AllPerformance } from '../../views/AllPerformance';

import useT from '../../hooks/useT';

const SECTIONS = [
	{
		id: 'spending',
		label: 'Spending',
		ko: '지출',
		subs: [
			{ id: 'expense', label: 'Expense', ko: '지출', component: <MonthlyExpense /> },
			{ id: 'gifts',   label: 'Gifts',   ko: '선물·용돈', component: <FamilyGifts /> }
		]
	},
	{
		id: 'investing',
		label: 'Investing',
		ko: '투자',
		subs: [
			{ id: 'portfolio',   label: 'Portfolio',   ko: '포트폴리오',   component: <InvestmentPortfolio /> },
			{ id: 'performance', label: 'Performance', ko: '종목별 수익률', component: null /* uses AllPerformance render */ },
			{ id: 'return',      label: 'Return',      ko: '수익률',      component: <RateOfReturn /> },
			{ id: 'dividend',    label: 'Dividend',    ko: '배당',        component: <Dividend /> },
			{ id: 'positions',   label: 'History',     ko: '보유내역',     component: <InvestmentHistory /> }
		]
	},
	{
		id: 'cards',
		label: 'Cards',
		ko: '카드',
		subs: [
			{ id: 'amex', label: 'Amex', ko: 'Amex', component: <AmexTracker /> }
		]
	}
];

const SUB_TO_SECTION = {};
SECTIONS.forEach(s => s.subs.forEach(sub => { SUB_TO_SECTION[sub.id] = s.id; }));

function PillNav ({ items, activeId, onClick, T }) {
	return (
		<Box sx={{
			display: 'inline-flex',
			background: T.surf2,
			borderRadius: '12px',
			padding: '4px',
			gap: '2px',
			overflowX: 'auto',
			maxWidth: '100%'
		}}>
			{items.map(it => {
				const active = it.id === activeId;
				return (
					<Box
						key={it.id}
						component="button"
						type="button"
						onClick={() => onClick(it.id)}
						sx={{
							padding: '8px 16px',
							borderRadius: '9px',
							border: 'none',
							cursor: 'pointer',
							background: active ? T.surf : 'transparent',
							color: active ? T.ink : T.ink2,
							boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
							fontFamily: 'inherit',
							fontSize: 13,
							fontWeight: 600,
							whiteSpace: 'nowrap',
							transition: 'all 0.15s'
						}}
					>
						{it.label}
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, marginLeft: '6px', fontSize: 11 }}>· {it.ko}</Box>
					</Box>
				);
			})}
		</Box>
	);
}

function SubTabs ({ items, activeId, onClick, T }) {
	if (items.length <= 1) return null;
	return (
		<Box sx={{ display: 'flex', gap: '6px', borderBottom: `1px solid ${T.rule}` }}>
			{items.map(it => {
				const active = it.id === activeId;
				return (
					<Box
						key={it.id}
						component="button"
						type="button"
						onClick={() => onClick(it.id)}
						sx={{
							padding: '10px 16px 12px',
							background: 'transparent',
							border: 'none',
							borderBottom: `2px solid ${active ? T.acc.bright : 'transparent'}`,
							marginBottom: '-1px',
							cursor: 'pointer',
							color: active ? T.ink : T.ink2,
							fontFamily: 'inherit',
							fontSize: 13,
							fontWeight: 600,
							transition: 'all 0.15s'
						}}
					>
						{it.label}
						<Box component="span" sx={{ fontWeight: 400, marginLeft: '6px', fontSize: 11, opacity: 0.7 }}>· {it.ko}</Box>
					</Box>
				);
			})}
		</Box>
	);
}

export function ReportMain () {
	const { tab } = useParams();
	const navigate = useNavigate();
	const T = useT();

	const subId = tab || 'expense';
	const sectionId = SUB_TO_SECTION[subId] || 'spending';
	const section = SECTIONS.find(s => s.id === sectionId);
	const subs = section ? section.subs : [];
	const activeSub = subs.find(s => s.id === subId) || subs[0];

	const handlePill = (newSectionId) => {
		const target = SECTIONS.find(s => s.id === newSectionId);
		if (target && target.subs.length > 0) {
			navigate(`/report/${target.subs[0].id}`);
		}
	};
	const handleSub = (newSubId) => {
		navigate(`/report/${newSubId}`);
	};

	const headerRight = useMemo(() => (
		<PillNav items={SECTIONS} activeId={sectionId} onClick={handlePill} T={T} />
	), [sectionId, T]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<DesignPage title="Reports" titleKo="리포트" headerRight={headerRight}>
			<Stack spacing={2.5}>
				<SubTabs items={subs} activeId={activeSub ? activeSub.id : subId} onClick={handleSub} T={T} />
				<Box>
					{activeSub && activeSub.id === 'performance' ? (
						<AllPerformance embedded />
					) : (
						activeSub && activeSub.component
					)}
				</Box>
			</Stack>
		</DesignPage>
	);
}

export default ReportMain;
