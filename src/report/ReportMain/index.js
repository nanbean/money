import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import DesignPage from '../../components/DesignPage';
import FadeScroller from '../../components/FadeScroller';
import MonthlyExpense from '../MonthlyExpense';
import Dividend from '../Dividend';
import FamilyGifts from '../FamilyGifts';
import InvestmentHistory from '../InvestmentHistory';
import InvestmentPortfolio from '../InvestmentPortfolio';
import RateOfReturn from '../RateOfReturn';
import AmexTracker from '../AmexTracker';
import TaxTracker from '../TaxTracker';
import { AllPerformance } from '../../views/AllPerformance';

import useT from '../../hooks/useT';

const SECTIONS = [
	{
		id: 'spending',
		label: 'Spending',
		ko: '지출',
		subs: [
			// fillViewport: 데스크톱에서 페이지를 화면 높이에 맞추고 Monthly breakdown
			// 표 안에서만 스크롤한다. 높이를 어림값(100vh - 140px)으로 잡았을 때는 실제
			// 상단 영역이 더 커서 페이지 스크롤과 표 스크롤이 겹쳤다.
			{ id: 'expense', label: 'Expense', ko: '지출', component: <MonthlyExpense />, fillViewport: true },
			{ id: 'gifts',   label: 'Gifts',   ko: '선물·용돈', component: <FamilyGifts /> }
		]
	},
	{
		id: 'investing',
		label: 'Investing',
		ko: '투자',
		subs: [
			// 트리맵이 고정 600px 이라 화면을 조금 넘쳐 아래 여백만큼 스크롤이 생겼다. 화면에 맞춘다.
			{ id: 'portfolio',   label: 'Portfolio',   ko: '포트폴리오',   component: <InvestmentPortfolio />, fillViewport: true },
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
	},
	{
		id: 'tax',
		label: 'Tax',
		ko: '세금',
		subs: [
			{ id: 'tax', label: 'Deduction', ko: '소득공제', component: <TaxTracker /> }
		]
	}
];

const SUB_TO_SECTION = {};
SECTIONS.forEach(s => s.subs.forEach(sub => { SUB_TO_SECTION[sub.id] = s.id; }));

function PillNav ({ items, activeId, onClick, T }) {
	// 섹션 버튼도 모바일에서 화면을 넘으면 하위 탭과 같은 방식(FadeScroller)으로 스크롤한다.
	// 알약 배경은 바깥 상자에 두고 안쪽만 페이드한다 — 상자에 걸면 배경까지 흐려진다.
	// 활성 버튼 그림자가 overflow 에 잘리지 않게 안쪽에 2px 여유를 둔다.
	return (
		<Box sx={{
			display: 'inline-flex',
			background: T.surf2,
			borderRadius: '12px',
			padding: '2px',
			maxWidth: '100%',
			overflow: 'hidden'
		}}>
			<FadeScroller activeKey={activeId} gap="2px" padding="2px" sx={{ minWidth: 0 }}>
				{items.map(it => {
					const active = it.id === activeId;
					return (
						<Box
							key={it.id}
							data-active={active ? 'true' : undefined}
							component="button"
							type="button"
							onClick={() => onClick(it.id)}
							sx={{
								padding: { xs: '8px 12px', sm: '8px 16px' },
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
			</FadeScroller>
		</Box>
	);
}

function SubTabs ({ items, activeId, onClick, T }) {
	if (items.length <= 1) return null;
	// 모바일에서 탭이 화면 폭을 넘으면 이 줄 안에서만 가로 스크롤한다 (예전에는 넘친 폭이
	// 페이지를 밀었다). 잘린 쪽 페이드·스냅·선택 탭 가운데 정렬은 FadeScroller 가 한다.
	// 밑줄은 음수 margin 대신 inset 그림자로 그린다 — overflow-x 가 auto 면 y 도
	// 스크롤 영역이 되어 1px 세로 스크롤이 생긴다.
	return (
		<FadeScroller activeKey={activeId} sx={{ boxShadow: `inset 0 -1px 0 ${T.rule}` }}>
			{items.map(it => {
				const active = it.id === activeId;
				return (
					<Box
						key={it.id}
						data-active={active ? 'true' : undefined}
						component="button"
						type="button"
						onClick={() => onClick(it.id)}
						sx={{
							whiteSpace: 'nowrap',
							padding: { xs: '10px 12px 12px', sm: '10px 16px 12px' },
							background: 'transparent',
							border: 'none',
							borderBottom: `2px solid ${active ? T.acc.bright : 'transparent'}`,
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
		</FadeScroller>
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

	// 화면 높이에 맞추는 탭은 DesignPage → Stack → 탭 본문까지 flex 체인을 이어
	// 줘야 안쪽 표가 남은 높이를 받는다 (md 이상만; 모바일은 페이지 스크롤 그대로).
	const fillViewport = !!(activeSub && activeSub.fillViewport);
	const fillSx = fillViewport ? { flex: { md: 1 }, minHeight: { md: 0 } } : undefined;

	return (
		<DesignPage title="Reports" titleKo="리포트" headerRight={headerRight} fillViewport={fillViewport}>
			<Stack spacing={2.5} sx={fillSx}>
				<SubTabs items={subs} activeId={activeSub ? activeSub.id : subId} onClick={handleSub} T={T} />
				<Box sx={fillViewport ? { ...fillSx, display: { md: 'flex' }, flexDirection: 'column' } : undefined}>
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
