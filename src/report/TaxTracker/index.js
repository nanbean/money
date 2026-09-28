import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import moment from 'moment';

import useT from '../../hooks/useT';
import { sDisplay, sMono, labelStyle, fmtKRW } from '../../utils/designTokens';
import { calcYearEndTax, spendingTargets } from '../../utils/taxDeduction';
import { collectPayslips, projectAnnual, projectNextYear } from '../../utils/payslip';


// 오은미 명의 카드. 소득공제는 명의자 기준이라 본인 카드와 섞으면 안 된다.
const SPOUSE_CARDS = ['account:CCard:KB카드오은미', 'account:CCard:생활비카드'];
const SPOUSE_PENSION = {
	savings: 'account:Bank:오은미연금저축_Cash',
	irp: 'account:Bank:IRP오은미_Cash'
};
const SALARY_PAYEE = '오은미월급';

// 신용카드 소득공제에서 법으로 빠지는 지출. 카드로 냈어도 공제 대상이 아니다.
const EXCLUDED_CATEGORY = /^(세금|공과금|보험|통신비)/;
// 차량 구입비도 빠진다. 카드대금 납부는 소비가 아니라 이체다.
const EXCLUDED_SUB = /차량구입비/;
const isTransfer = (t) => /카드납부/.test(t.payee || '');
const isAnnualFee = (t) => /연회비/.test(t.payee || '');

// 기본공제는 본인 1명뿐이다. 배우자는 소득이 있어 요건에 안 맞고, 자녀 2명은
// 결정세액이 0 인 이쪽에 넣으면 그대로 버려져서 배우자 쪽으로 보낸다.
// 내년 계획을 세우려면 아직 오지 않은 해도 골라야 한다. 공용 YEAR_LIST 는
// 올해까지라 과거 조회용이다.
const THIS_YEAR = parseInt(moment().format('YYYY'), 10);
const YEARS = [THIS_YEAR + 1, THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2];

// 내년 연봉 인상률 가정. 정확한 값은 알 수 없고, 이 화면은 '카드를 얼마 써야
// 하나' 를 보는 곳이라 대략치로 충분하다. 총급여를 직접 입력하면 이 값은 무시된다.
const NEXT_YEAR_RAISE = 0.03;

const DEPENDENTS = 1;

const STORE_KEY = 'taxTracker.eunmi';

const loadInputs = () => {
	try {
		const raw = window.localStorage.getItem(STORE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch (e) {
		return {};
	}
};

const saveInputs = (v) => {
	try {
		window.localStorage.setItem(STORE_KEY, JSON.stringify(v));
	} catch (e) {
		// 사생활 보호 모드 등에서 막힐 수 있다. 저장 실패가 화면을 깨면 안 된다.
	}
};

export function TaxTracker () {
	const T = useT();
	const lab = labelStyle(T);

	const allAccountsTransactions = useSelector((state) => state.allAccountsTransactions);
	const [year, setYear] = useState(THIS_YEAR);
	const stored = loadInputs();
	const [cashReceipt, setCashReceipt] = useState(stored.cashReceipt ?? '');
	// 연간 예상치. 비워 두면 기록된 실적을 그대로 쓴다.
	const [salaryOverride, setSalaryOverride] = useState(stored.salaryOverride ?? '');
	const [pensionOverride, setPensionOverride] = useState(stored.pensionOverride ?? '');
	const [healthOverride, setHealthOverride] = useState(stored.healthOverride ?? '');
	const [expanded, setExpanded] = useState([]);

	const toggleRow = (id) =>
		setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

	const persist = (patch) => saveInputs({
		cashReceipt, salaryOverride, pensionOverride, healthOverride, ...patch
	});

	const start = moment().year(year).startOf('year').format('YYYY-MM-DD');
	const end = moment().year(year).endOf('year').format('YYYY-MM-DD');

	const data = useMemo(() => {
		const inRange = (allAccountsTransactions || []).filter(t => t.date >= start && t.date <= end);

		// 급여명세 division 에서 총급여와 공제액을 복원하고, 남은 달은 마지막
		// 명세의 정기분으로 채운다.
		let collected = collectPayslips(inRange, SALARY_PAYEE);
		let basisYear = year;

		// 내년을 고르면 급여 기록이 아직 없다. 직전 해 명세를 기준으로 잡아야
		// 문턱(총급여 25%)이 나오고, 그래야 '얼마 써야 하나' 를 계산할 수 있다.
		if (collected.count === 0) {
			const prevStart = moment().year(year - 1).startOf('year').format('YYYY-MM-DD');
			const prevEnd = moment().year(year - 1).endOf('year').format('YYYY-MM-DD');
			const prev = collectPayslips(
				(allAccountsTransactions || []).filter(t => t.date >= prevStart && t.date <= prevEnd),
				SALARY_PAYEE
			);
			if (prev.count > 0) {
				collected = prev;
				basisYear = year - 1;
			}
		}

		// 올해 총급여를 내년에 그대로 쓰면 안 된다. 중간에 복직한 해라면 올해는
		// 반년치뿐이고, 내년은 1월부터 12개월을 받는다.
		const nextYear = basisYear !== year;
		const projected = nextYear
			? projectNextYear(collected, NEXT_YEAR_RAISE)
			: projectAnnual(collected);

		// 카드 사용액. 공제 대상만 남긴다.
		const cardRows = inRange.filter(t => SPOUSE_CARDS.includes(t.accountId) && t.amount < 0 && !isTransfer(t));
		const eligible = cardRows.filter(t =>
			!EXCLUDED_CATEGORY.test(t.category || '') && !EXCLUDED_SUB.test(t.subcategory || '') && !isAnnualFee(t));
		const excluded = cardRows.filter(t =>
			EXCLUDED_CATEGORY.test(t.category || '') || EXCLUDED_SUB.test(t.subcategory || '') || isAnnualFee(t));

		const creditCard = eligible.reduce((s, t) => s + Math.abs(t.amount), 0);
		const excludedSum = excluded.reduce((s, t) => s + Math.abs(t.amount), 0);

		// 연금계좌 납입. 현금 계좌로 들어간 금액이 곧 납입액이다.
		const sumPension = (acc) => inRange
			.filter(t => t.accountId === acc && t.amount > 0)
			.reduce((s, t) => s + t.amount, 0);

		return {
			actual: collected.actual,
			monthly: collected.monthly,
			projected,
			payslips: collected.count,
			basisYear,
			isPlan: basisYear !== year,
			lastMonth: collected.lastMonth,
			remainingMonths: projected.remaining || 0,
			creditCard,
			excludedSum,
			cardCount: eligible.length,
			pensionSavings: sumPension(SPOUSE_PENSION.savings),
			irp: sumPension(SPOUSE_PENSION.irp)
		};
	}, [allAccountsTransactions, start, end, year]);

	// 기본값은 남은 달까지 채운 연간 추정치다. 실적만 쓰면 총급여가 과소평가되고,
	// 그러면 최저사용금액 문턱이 낮게 잡혀 '이미 공제 구간' 이라는 반대 결론이 난다.
	// 직접 넣은 값이 있으면 그쪽이 이긴다.
	const pick = (override, auto) => (override === '' || override === null ? auto : Number(override) || 0);

	const input = {
		salary: pick(salaryOverride, data.projected.salary),
		dependents: DEPENDENTS,
		pensionContribution: pick(pensionOverride, data.projected.pensionContribution),
		healthInsurance: pick(healthOverride, data.projected.healthInsurance),
		creditCard: data.creditCard,
		cashReceipt: Number(cashReceipt) || 0,
		pensionSavings: data.pensionSavings,
		irp: data.irp,
		withheldTax: pick(salaryOverride, data.projected.withheldTax)
	};
	const projecting = !data.isPlan && data.remainingMonths > 0;

	const result = calcYearEndTax(input);
	// 지방소득세는 소득세의 10% 로 따로 매겨지고 따로 환급된다. 결정세액이 0 이면
	// 원천징수된 지방소득세도 전액 돌아온다.
	const localRefund = pick(salaryOverride, data.projected.localTax) - Math.floor(result.finalTax * 0.1);

	const money = (n) => Number(n || 0).toLocaleString('ko-KR');
	const projNote = projecting
		? `\n(${data.lastMonth}월까지 실적 + ${data.remainingMonths}개월 추정)`
		: '';

	// 실적에는 정산분이 이미 들어 있다. 추정에서만 빠진다는 걸 줄마다 분명히 적는다 —
	// '제외' 라고만 쓰면 공제 자체에서 뺀 것으로 읽힌다.
	const breakdown = (title, actual, monthly, total, override) => {
		if (override !== '' && override !== null) {
			return `${title}\n\n직접 입력한 값 ${money(total)} 을 쓰고 있습니다.\n(자동 추정값은 ${money(actual + monthly * data.remainingMonths)})`;
		}
		if (data.isPlan) {
			return `${title}\n\n${data.basisYear}년 ${data.lastMonth}월 정기분 × 12개월 × 인상률 ${(1 + NEXT_YEAR_RAISE).toFixed(2)}\n= ${money(total)}`;
		}
		if (!projecting) return `${title}\n실적 ${money(actual)}`;
		return `${title}\n\n실적 ${money(actual)}  (1~${data.lastMonth}월, 정산분 포함)\n+ 추정 ${money(monthly * data.remainingMonths)}  (${data.lastMonth}월 정기분 ${money(monthly)} × ${data.remainingMonths}개월)\n= ${money(total)}`;
	};

	const targets = spendingTargets(input);
	// 한도까지 다 채웠을 때 세금이 실제로 얼마나 줄어드는지. 공제액이 아니라
	// 줄어드는 세금이 판단 기준이다 — 결정세액이 0 이면 다 채워도 0 원이다.
	const atLimit = calcYearEndTax({ ...input, cashReceipt: input.cashReceipt + targets.byCashReceipt });
	const taxSavedAtLimit = result.finalTax - atLimit.finalTax;

	// 문턱을 넘었는지, 얼마나 남았는지. 막대만으로는 넘긴 건지 꽉 찬 건지 구분이 안 된다.
	const usedTotal = input.creditCard + input.cashReceipt;
	const overThreshold = usedTotal - result.card.threshold;

	const eb = result.earnedBracket;
	const tb = result.taxRateBracket;
	const card = result.card;

	const hints = {
		salary: data.isPlan
			? `${data.basisYear}년 ${data.lastMonth}월 정기분 ${money(data.monthly.taxableSalary)} × 12개월\n+ 명절휴가비 ${money(data.projected.holidayBonus)} (설·추석 2회)\n× 인상률 ${(1 + NEXT_YEAR_RAISE).toFixed(2)}\n= ${money(input.salary)}\n\n${data.basisYear}년은 중간 복직이라 총급여가 반년치뿐입니다. 그대로 쓰면 문턱이 절반으로 잡혀 계산이 빗나갑니다.`
			: `총 지급액 ${money(data.actual.gross)}\n− 비과세 ${money(data.actual.nonTaxable)} (정액급식비·교원연구비)\n= 실적 ${money(data.actual.taxableSalary)}${projNote}`,
		earnedDeduction: `총급여 ${eb.label} 구간\n${money(eb.base)} + (${money(input.salary)} − ${money(eb.from)}) × ${eb.rate * 100}%\n= ${money(result.earnedDeduction)}\n\n근로소득금액 = ${money(input.salary)} − ${money(result.earnedDeduction)} = ${money(result.earnedIncome)}`,
		earnedIncome: `총급여 ${money(input.salary)}\n− 근로소득공제 ${money(result.earnedDeduction)}\n= ${money(result.earnedIncome)}\n\n여기서부터 각종 소득공제를 빼면 과세표준이 됩니다.`,
		personal: `본인 1명 × 1,500,000\n= ${money(result.personal)}\n\n· 배우자는 소득이 있어 공제 대상이 아닙니다 (연간 소득금액 100만원 이하만 가능).\n· 자녀 2명은 배우자 쪽에서 공제받습니다. 부부 중 한 사람만 받을 수 있는데, 결정세액이 0원인 이쪽에 넣으면 그대로 버려집니다.`,
		pension: breakdown(
			'공무원연금 일반기여금 (복직정산·과미납금 포함)',
			data.actual.pensionContribution,
			data.monthly.pensionContribution,
			input.pensionContribution,
			pensionOverride
		),
		health: breakdown(
			'건강보험 + 노인장기요양보험 (복직정산 포함)',
			data.actual.healthInsurance,
			data.monthly.healthInsurance,
			input.healthInsurance,
			healthOverride
		),
		card: card.remainingToThreshold > 0
			? `최저사용금액(총급여 25%) ${money(card.threshold)}\n사용액 ${money(input.creditCard + input.cashReceipt)}\n${money(card.remainingToThreshold)} 더 써야 공제가 시작됩니다`
			: `최저사용금액(총급여 25%) ${money(card.threshold)}\n공제율 낮은 신용카드부터 차감\n\n신용카드 ${money(input.creditCard)} (15%)\n현금영수증 ${money(input.cashReceipt)} (30%)\n= ${money(card.deduction)}${card.capped ? `\n\n한도 ${money(card.limit)} 적용됨` : `  (한도 ${money(card.limit)})`}\n\n세액공제가 아니라 소득공제라서 과세표준에서 뺍니다.\n실제 절세액은 여기에 세율을 곱한 만큼입니다.`,
		taxBase: `근로소득금액 ${money(result.earnedIncome)}\n− 기본공제 ${money(result.personal)} (${input.dependents}명 × 150만)\n− 연금보험료 ${money(input.pensionContribution)}\n− 건강보험료 ${money(input.healthInsurance)}\n− 신용카드 등 ${money(card.deduction)}\n= ${money(result.taxBase)}`,
		calculated: `과세표준 ${tb.label} 구간\n${money(result.taxBase)} × ${tb.rate * 100}%${tb.progressive ? ` − 누진공제 ${money(tb.progressive)}` : ''}\n= ${money(result.calculated)}`,
		earnedCredit: `산출세액 ${money(result.calculated)} ${result.calculated <= 1300000 ? '× 55%' : '→ 715,000 + (초과분 × 30%)'}\n= ${money(result.earned.raw)}\n한도 ${money(result.earned.limit)}${result.earned.capped ? ' (한도 적용됨)' : ''}`,
		pensionCredit: `연금저축 ${money(input.pensionSavings)} (600만 한도)\n+ IRP ${money(input.irp)}\n= 대상 ${money(result.pension.eligible)} (합산 900만 한도)\n× ${result.pension.rate * 100}% (총급여 ${input.salary <= 55000000 ? '5,500만 이하' : '5,500만 초과'})`,
		finalTax: `산출세액 ${money(result.calculated)}\n− 세액공제 ${money(result.totalCredit)}\n= ${result.calculated - result.totalCredit < 0 ? `${money(result.calculated - result.totalCredit)} → 0 (음수는 0)` : money(result.finalTax)}`,
		withheld: `급여에서 원천징수된 소득세${projNote}\n지방소득세는 아래 줄에서 따로 계산합니다`,
		expectedWithholding: `${data.basisYear}년 ${data.lastMonth}월 소득세 × 12개월 × 인상률 ${(1 + NEXT_YEAR_RAISE).toFixed(2)}\n= ${money(data.projected.expectedWithholding)}\n\n아직 받지 않은 급여라 낸 세금이 없습니다. 환급액은 ${year}년 급여가 실제로 들어온 뒤에 계산됩니다.`,
		refund: `기납부 소득세 ${money(input.withheldTax)}\n− 결정세액 ${money(result.finalTax)}\n= ${money(result.refund)}`,
		localRefund: `기납부 지방소득세 ${money(pick(salaryOverride, data.projected.localTax))}\n− 결정세액의 10% ${money(Math.floor(result.finalTax * 0.1))}\n= ${money(localRefund)}`
	};

	const panelSx = {
		background: T.surf,
		border: `1px solid ${T.rule}`,
		borderRadius: '16px',
		padding: { xs: '14px', md: '18px' },
		color: T.ink
	};

	const selectSx = {
		minWidth: 120,
		'& .MuiOutlinedInput-root': {
			background: T.bg,
			borderRadius: '8px',
			fontSize: 13,
			color: T.ink,
			height: 36
		},
		'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
		'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.acc.hero }
	};

	const fieldSx = {
		'& .MuiOutlinedInput-root': {
			background: T.bg,
			borderRadius: '8px',
			fontSize: 13,
			color: T.ink,
			height: 36
		},
		'& .MuiOutlinedInput-notchedOutline': { borderColor: T.rule },
		'& input': { color: T.ink, ...sMono }
	};

	// 줄을 누르면 계산 과정이 펼쳐지고 다시 누르면 닫힌다. 숫자만 있으면
	// 맞는지 틀렸는지 알 수 없어서, 검산할 수 있게 근거를 같이 둔다.
	const Row = ({ id, label, value, strong, tone, detail }) => {
		const open = expanded.includes(id);
		return (
			<Box sx={{ borderBottom: `1px solid ${T.rule}` }}>
				<Stack
					direction="row"
					justifyContent="space-between"
					alignItems="center"
					onClick={detail ? () => toggleRow(id) : undefined}
					sx={{
						padding: '8px 0',
						cursor: detail ? 'pointer' : 'default',
						'&:hover': detail ? { background: T.dark ? '#1a1a22' : '#fafaff' } : {}
					}}
				>
					<Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
						{detail && (
							<Box component="span" sx={{
								display: 'inline-flex',
								color: open ? T.acc.bright : T.ink3,
								transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
								transition: 'transform 0.15s'
							}}>
								<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
							</Box>
						)}
						<Typography sx={{ fontSize: 13, color: open ? T.ink : T.ink2 }}>{label}</Typography>
					</Stack>
					<Typography sx={{
						...sMono,
						fontSize: 13,
						fontWeight: strong ? 700 : 500,
						color: tone || T.ink,
						whiteSpace: 'nowrap'
					}}>{value}</Typography>
				</Stack>
				{open && detail && (
					<Box sx={{
						...sMono,
						whiteSpace: 'pre-line',
						fontSize: 12,
						lineHeight: 1.75,
						color: T.ink2,
						background: T.dark ? '#16161d' : '#f7f7fc',
						border: `1px solid ${T.rule}`,
						borderRadius: '10px',
						padding: '12px 14px',
						margin: '0 0 10px 20px',
						overflowX: 'auto'
					}}>
						{detail}
					</Box>
				)}
			</Box>
		);
	};

	const Bar = ({ value, max, color }) => (
		<Box sx={{ height: 8, background: T.dark ? '#22222c' : '#ececf4', borderRadius: 99, overflow: 'hidden' }}>
			<Box sx={{
				height: '100%',
				width: `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%`,
				background: color,
				borderRadius: 99,
				transition: 'width 0.3s'
			}} />
		</Box>
	);

	return (
		<Stack spacing={2}>
			{/* 카드 공제 진행 */}
			<Box sx={panelSx}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ marginBottom: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
					<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700 }}>
						Card deduction
						<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 오은미 카드 공제 진행</Box>
					</Typography>
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography sx={lab}>Year</Typography>
						<FormControl size="small" sx={selectSx}>
							<Select
								value={year}
								onChange={(e) => setYear(e.target.value)}
								MenuProps={{ PaperProps: { sx: { background: T.surf, color: T.ink, border: `1px solid ${T.rule}` } } }}
							>
								{YEARS.map(y => <MenuItem key={y} value={y}>{y}{y === THIS_YEAR + 1 ? ' (계획)' : ''}</MenuItem>)}
							</Select>
						</FormControl>
					</Stack>
				</Stack>

				<Stack spacing={2}>
					<Box>
						<Stack direction="row" justifyContent="space-between" sx={{ marginBottom: '5px', flexWrap: 'wrap' }}>
							<Typography sx={{ fontSize: 12, color: T.ink2 }}>
								쓴 금액 <Box component="span" sx={{ color: T.ink3 }}>/</Box> 최저사용금액 (총급여 25%)
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 12, color: T.ink }}>
								{fmtKRW(usedTotal)} <Box component="span" sx={{ color: T.ink3 }}>/</Box> {fmtKRW(result.card.threshold)}
							</Typography>
						</Stack>
						<Bar value={usedTotal} max={result.card.threshold} color={overThreshold > 0 ? T.pos : T.acc.hero} />
						<Typography sx={{ fontSize: 11, color: overThreshold > 0 ? T.pos : T.ink3, marginTop: '5px' }}>
							{overThreshold > 0
								? `문턱을 ${fmtKRW(overThreshold)} 넘었습니다. 이 초과분에만 공제율이 붙습니다.`
								: `${fmtKRW(-overThreshold)} 더 써야 공제가 시작됩니다. 그전까지는 한 푼도 공제되지 않습니다.`}
						</Typography>
					</Box>
					<Box>
						<Stack direction="row" justifyContent="space-between" sx={{ marginBottom: '5px', flexWrap: 'wrap' }}>
							<Typography sx={{ fontSize: 12, color: T.ink2 }}>
								공제액 <Box component="span" sx={{ color: T.ink3 }}>/</Box> 한도
							</Typography>
							<Typography sx={{ ...sMono, fontSize: 12, color: T.ink }}>
								{fmtKRW(result.card.deduction)} <Box component="span" sx={{ color: T.ink3 }}>/</Box> {fmtKRW(result.card.limit)}
							</Typography>
						</Stack>
						<Bar value={result.card.deduction} max={result.card.limit} color={result.card.capped ? T.pos : T.acc.bright} />
						<Typography sx={{ fontSize: 11, color: T.ink3, marginTop: '5px' }}>
							{result.card.capped
								? '한도를 채웠습니다. 더 써도 공제액은 늘지 않습니다.'
								: `한도까지 ${fmtKRW(result.card.limit - result.card.deduction)} 남았습니다.`}
						</Typography>
					</Box>
				</Stack>

				<Box sx={{ marginTop: 2 }}>
					<Row label={`신용카드 사용액 · ${data.cardCount}건 (자동 집계)`} value={fmtKRW(data.creditCard)} />
					<Row label="현금영수증 (직접 입력)" value={fmtKRW(input.cashReceipt)} />
					<Row label="공제 제외 (세금·공과금·보험·연회비)" value={fmtKRW(data.excludedSum)} tone={T.ink3} />
				</Box>
			</Box>

			{/* 얼마나 더 써야 하나 */}
			<Box sx={panelSx}>
				<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, marginBottom: 0.5 }}>
					Spending target
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 얼마나 더 써야 하나</Box>
				</Typography>
				<Typography sx={{ fontSize: 11.5, color: T.ink3, marginBottom: 1.5 }}>
					총급여 {fmtKRW(input.salary)} 기준
					{data.isPlan && ` · ${data.basisYear}년 ${data.lastMonth}월 정기분을 12개월로 펴고 명절휴가비 2회와 인상률 ${NEXT_YEAR_RAISE * 100}%를 반영했습니다`}
				</Typography>

				{targets.headroom === 0 ? (
					<Typography sx={{ fontSize: 13, color: T.pos }}>
						공제 한도 {fmtKRW(targets.limit)}를 이미 채웠습니다. 더 써도 공제액은 늘지 않습니다.
					</Typography>
				) : (
					<>
						{targets.toThreshold > 0 && (
							<Box sx={{
								background: T.dark ? '#2a1f16' : '#fff7ed',
								border: `1px solid ${T.rule}`,
								borderRadius: '10px',
								padding: '10px 12px',
								marginBottom: 1.5
							}}>
								<Typography sx={{ fontSize: 12.5, color: T.ink }}>
									공제가 시작되려면 먼저 <Box component="span" sx={{ ...sMono, fontWeight: 700 }}>{fmtKRW(targets.toThreshold)}</Box>을 더 써야 합니다.
									결제수단과 상관없이 이 금액까지는 공제가 0원입니다.
								</Typography>
							</Box>
						)}

						<Typography sx={{ fontSize: 12, color: T.ink2, marginBottom: 1 }}>
							남은 공제 여유 {fmtKRW(targets.headroom)}를 다 채우려면 — <Box component="span" sx={{ color: T.ink, fontWeight: 700 }}>둘 중 한 가지 방법</Box>으로
						</Typography>
						<Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', alignItems: 'stretch', rowGap: 1 }}>
							{[
								{ k: '현금영수증·체크카드', v: targets.byCashReceipt, part: targets.cashDeductionPart, note: '공제율 30%', best: true },
								{ k: '신용카드', v: targets.byCreditCard, part: targets.creditDeductionPart, note: '공제율 15%', best: false }
							].map((item, i) => (
								<React.Fragment key={item.k}>
									{i === 1 && (
										<Box sx={{
											display: 'flex',
											alignItems: 'center',
											padding: '0 12px',
											fontSize: 12,
											color: T.ink3,
											fontWeight: 700
										}}>또는</Box>
									)}
									<Box sx={{
										flex: '1 1 200px',
										padding: '12px 14px',
										borderRadius: '12px',
										background: item.best ? (T.dark ? '#1b2a1b' : '#f0f8f0') : T.bg,
										border: `1px solid ${item.best ? T.pos : T.rule}`
									}}>
										<Typography sx={{ fontSize: 11, color: T.ink3, fontWeight: 600 }}>{item.k}</Typography>
										<Typography sx={{ ...sMono, fontSize: 19, fontWeight: 700, color: item.best ? T.pos : T.ink, marginTop: '4px' }}>
											{fmtKRW(item.v)}
										</Typography>
										<Typography sx={{ ...sMono, fontSize: 10.5, color: T.ink3, marginTop: '4px' }}>
											{targets.toThreshold > 0 ? `문턱 ${fmtKRW(targets.toThreshold)} + 공제구간 ${fmtKRW(item.part)}` : `공제구간 ${fmtKRW(item.part)}`}
										</Typography>
										<Typography sx={{ fontSize: 10.5, color: T.ink3, marginTop: '2px' }}>{item.note}</Typography>
									</Box>
								</React.Fragment>
							))}
						</Stack>
						<Typography sx={{ fontSize: 11.5, color: T.ink3, marginTop: 1 }}>
							두 금액을 더하는 것이 아닙니다. 어느 결제수단으로 쓰느냐에 따라 같은 공제를 받는 데
							필요한 금액이 두 배 차이납니다. 문턱 {fmtKRW(targets.toThreshold)}은 양쪽에 똑같이 들어 있습니다.
						</Typography>

						<Box sx={{
							marginTop: 1.5,
							paddingTop: 1.5,
							borderTop: `1px solid ${T.rule}`
						}}>
							<Stack direction="row" justifyContent="space-between" sx={{ flexWrap: 'wrap' }}>
								<Typography sx={{ fontSize: 13, color: T.ink2 }}>다 채웠을 때 줄어드는 세금</Typography>
								<Typography sx={{ ...sMono, fontSize: 13, fontWeight: 700, color: taxSavedAtLimit > 0 ? T.pos : T.neg }}>
									{fmtKRW(taxSavedAtLimit)}
								</Typography>
							</Stack>
							<Typography sx={{ fontSize: 11.5, color: taxSavedAtLimit > 0 ? T.ink3 : T.neg, marginTop: '6px' }}>
								{taxSavedAtLimit > 0
									? '공제액이 아니라 실제로 덜 내는 세금입니다. 소득공제라 여기에 세율이 곱해집니다.'
									: '이미 결정세액이 0원이라 카드를 아무리 더 써도 환급이 늘지 않습니다. 적립되는 카드를 쓰는 편이 낫습니다.'}
							</Typography>
						</Box>
					</>
				)}
			</Box>

			{/* 연말정산 요약 */}
			<Box sx={panelSx}>
				<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, marginBottom: 1.5 }}>
					Year-end settlement
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 연말정산 · {data.isPlan ? `${year}년 계획 (${data.basisYear}년 기준)` : `급여명세 ${data.payslips}건${projecting ? ` + ${data.remainingMonths}개월 추정` : ''}`}</Box>
				</Typography>
				{projecting && (
					<Typography sx={{ fontSize: 11.5, color: T.ink3, marginBottom: 1 }}>
						{data.lastMonth}월 명세까지 실적 {fmtKRW(data.actual.taxableSalary)}, 남은 {data.remainingMonths}개월은
						{data.lastMonth}월 정기분으로 추정했습니다. 명절휴가비·성과상여와 복직정산은 추정에서 뺐습니다.
					</Typography>
				)}
				{data.isPlan && (
					<Typography sx={{ fontSize: 11.5, color: T.ink3, marginBottom: 1 }}>
						{year}년은 아직 급여 기록이 없어 {data.basisYear}년 {data.lastMonth}월 정기분 {fmtKRW(data.monthly.taxableSalary)}을
						12개월로 펴고, 명절휴가비 2회와 인상률 {NEXT_YEAR_RAISE * 100}%를 더한 계획값입니다.
						정근수당·성과상여는 {data.basisYear}년 명세에 없어 빠져 있습니다.
					</Typography>
				)}
				<Row id="salary" label="총급여 (비과세 제외)" value={fmtKRW(result.salary)} strong detail={hints.salary} />
				<Row id="earnedDeduction" label="근로소득공제" value={`-${fmtKRW(result.earnedDeduction)}`} detail={hints.earnedDeduction} />
				<Row id="earnedIncome" label="= 근로소득금액" value={fmtKRW(result.earnedIncome)} strong detail={hints.earnedIncome} />
				<Row id="personal" label="기본공제" value={`-${fmtKRW(result.personal)}`} detail={hints.personal} />
				<Row id="pension" label="공무원연금 기여금" value={`-${fmtKRW(input.pensionContribution)}`} detail={hints.pension} />
				<Row id="health" label="건강보험료" value={`-${fmtKRW(input.healthInsurance)}`} detail={hints.health} />
				<Row id="card" label="신용카드 등" value={`-${fmtKRW(result.card.deduction)}`} detail={hints.card} />
				<Row id="taxBase" label="= 과세표준" value={fmtKRW(result.taxBase)} strong detail={hints.taxBase} />
				<Row id="calculated" label="산출세액" value={fmtKRW(result.calculated)} detail={hints.calculated} />
				<Row id="earnedCredit" label="근로소득세액공제" value={`-${fmtKRW(result.earnedCredit)}`} detail={hints.earnedCredit} />
				<Row id="pensionCredit" label={`연금계좌 세액공제 (${fmtKRW(result.pension.eligible)} × ${result.pension.rate * 100}%)`} value={`-${fmtKRW(result.pension.credit)}`} detail={hints.pensionCredit} />
				<Row id="finalTax" label="= 결정세액" value={fmtKRW(result.finalTax)} strong tone={result.finalTax === 0 ? T.pos : T.ink} detail={hints.finalTax} />
				{data.isPlan ? (
					<Row
						id="expectedWithholding"
						label="원천징수 예상액 (참고)"
						value={fmtKRW(data.projected.expectedWithholding)}
						detail={hints.expectedWithholding}
					/>
				) : (
					<>
						<Row id="withheld" label="기납부 소득세" value={fmtKRW(input.withheldTax)} detail={hints.withheld} />
						<Row id="refund" label="환급 예상 (소득세)" value={fmtKRW(result.refund)} strong tone={result.refund > 0 ? T.pos : T.ink} detail={hints.refund} />
						<Row id="localRefund" label="지방소득세 환급 (별도)" value={fmtKRW(localRefund)} tone={localRefund > 0 ? T.pos : T.ink} detail={hints.localRefund} />
					</>
				)}
				{result.wastedCredit > 0 && (
					<Typography sx={{ fontSize: 12, color: T.neg, marginTop: 1.5 }}>
						세액공제 {fmtKRW(result.wastedCredit)}가 산출세액을 넘어 소멸합니다. 연금계좌 납입을 줄여도 결정세액은 그대로 0원입니다.
					</Typography>
				)}
			</Box>

			{/* 입력 */}
			<Box sx={panelSx}>
				<Typography sx={{ ...sDisplay, fontSize: 16, fontWeight: 700, marginBottom: 0.5 }}>
					Inputs
					<Box component="span" sx={{ color: T.ink2, fontWeight: 400, fontSize: 12 }}> · 직접 입력</Box>
				</Typography>
				<Typography sx={{ fontSize: 11.5, color: T.ink3, marginBottom: 1.5 }}>
					현금영수증만 거래 기록에 남지 않아 홈택스 조회값이 필요합니다. 나머지는 급여명세에서 자동으로
					읽고 남은 달까지 추정하며, 비워 두면 그 추정치를 씁니다 — 아래 칸은 덮어쓸 때만 채우세요.
				</Typography>
				<Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
					<Box sx={{ flex: '1 1 180px' }}>
						<Typography sx={{ ...lab, marginBottom: '5px' }}>현금영수증 사용액</Typography>
						<TextField
							fullWidth size="small" type="number" sx={fieldSx}
							value={cashReceipt}
							onChange={(e) => { setCashReceipt(e.target.value); persist({ cashReceipt: e.target.value }); }}
							placeholder="0"
						/>
					</Box>
					<Box sx={{ flex: '1 1 180px' }}>
						<Typography sx={{ ...lab, marginBottom: '5px' }}>연간 총급여 (예상)</Typography>
						<TextField
							fullWidth size="small" type="number" sx={fieldSx}
							value={salaryOverride}
							onChange={(e) => { setSalaryOverride(e.target.value); persist({ salaryOverride: e.target.value }); }}
							placeholder={`추정 ${data.projected.salary}`}
						/>
					</Box>
					<Box sx={{ flex: '1 1 180px' }}>
						<Typography sx={{ ...lab, marginBottom: '5px' }}>연금 기여금 (예상)</Typography>
						<TextField
							fullWidth size="small" type="number" sx={fieldSx}
							value={pensionOverride}
							onChange={(e) => { setPensionOverride(e.target.value); persist({ pensionOverride: e.target.value }); }}
							placeholder={`추정 ${data.projected.pensionContribution}`}
						/>
					</Box>
					<Box sx={{ flex: '1 1 180px' }}>
						<Typography sx={{ ...lab, marginBottom: '5px' }}>건강보험료 (예상)</Typography>
						<TextField
							fullWidth size="small" type="number" sx={fieldSx}
							value={healthOverride}
							onChange={(e) => { setHealthOverride(e.target.value); persist({ healthOverride: e.target.value }); }}
							placeholder={`추정 ${data.projected.healthInsurance}`}
						/>
					</Box>
				</Stack>
			</Box>
		</Stack>
	);
}

export default TaxTracker;
