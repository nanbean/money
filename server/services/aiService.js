const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const getPortfolioComment = async (portfolioData) => {
	const { holdings, totalAppraisedValue, totalReturn, currency, cagrBase, cagr, projections, periodTwr, periodRange } = portfolioData;

	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		systemInstruction: '당신은 투자 포트폴리오 분석 전문가입니다. 간결하고 실용적인 분석을 3-4문장으로 제공합니다. 투자 결정은 본인 판단임을 항상 마지막에 한 문장으로 명시합니다.'
	});

	const holdingsText = holdings.map(h =>
		`- ${h.name}: ${h.displayValue} (비중 ${h.allocation}%, 수익률 ${h.returnRate > 0 ? '+' : ''}${h.returnRate}%)`
	).join('\n');

	let projectionText = '';
	if (cagr && projections) {
		const projText = projections.map(p => `  - ${p.years}년 후: ${p.displayValue}`).join('\n');
		projectionText = `
과거 ${cagrBase}년 CAGR: ${cagr > 0 ? '+' : ''}${cagr}%
이를 기반으로 한 미래 예측:
${projText}`;
	}

	const periodTwrText = periodTwr !== null
		? `\n최근 ${periodRange} 구간 수익률 (TWR, 현금유입 조정): ${periodTwr > 0 ? '+' : ''}${periodTwr}%`
		: '';

	const prompt = `다음은 현재 투자 포트폴리오 현황입니다.

총 평가금액: ${totalAppraisedValue}
전체 수익률: ${totalReturn > 0 ? '+' : ''}${totalReturn}%${periodTwrText}
표시 통화: ${currency}

종목별 현황:
${holdingsText}
${projectionText}

위 현황과 미래 예측을 바탕으로 3-4문장으로 분석 코멘트를 한국어로 작성해주세요. 현재 포트폴리오 특징, CAGR 수준 평가, 장기 전망의 주목할 점을 포함해주세요.`;

	const result = await model.generateContent(prompt);
	return result.response.text().trim();
};

module.exports = { getPortfolioComment };
