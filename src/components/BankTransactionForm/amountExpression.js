import { evaluate } from 'mathjs';

// 금액 칸에 '1000+2000' 처럼 식을 넣으면 계산해 준다.
//
// 컴포넌트 안에 있던 것을 빼냈다. mathjs 를 14 → 15 (major) 로 올리면서
// evaluate 동작을 확인할 방법이 필요했는데, 1,000줄 컴포넌트 안에서는
// 테스트가 닿지 않았다. 원래 취약점(GHSA, prod high) 때문에 올린 것이다.

// 연산자가 있고 숫자가 둘 이상이어야 식으로 본다. '-500' 은 그냥 음수 금액이다.
export const isAmountExpression = (value) => {
	const hasOperator = /[+\-*/]/.test(value);
	const numbersFound = String(value).match(/-?\d+(\.\d+)?/g);
	const hasAtLeastTwoNumbers = numbersFound && numbersFound.length >= 2;
	return Boolean(hasOperator && hasAtLeastTwoNumbers);
};

// 식이면 계산 결과를, 아니면 null 을 돌려준다.
//
// null 은 '바꾸지 말라' 는 뜻이다. 계산 실패에 0 을 넣으면 사용자가 입력한
// 금액이 조용히 사라진다.
export const evaluateAmount = (value) => {
	if (!isAmountExpression(value)) return null;

	try {
		const result = evaluate(value);
		// mathjs 는 단위·행렬·복소수도 돌려준다. 숫자가 아니면 금액이 아니다.
		//
		// isFinite 로 보는 이유는 0 으로 나누기다. '1000/0' 은 Infinity 를
		// 돌려주는데 typeof 는 'number' 이고 NaN 도 아니라, 원래 가드
		// (typeof !== 'number' || isNaN) 를 그대로 통과해 금액 칸에
		// Infinity 가 들어갔다.
		if (!Number.isFinite(result)) return null;
		// 원 단위 앱이지만 USD 계좌가 있어 소수점 둘째 자리까지 남긴다.
		return parseFloat(result.toFixed(2));
	} catch (err) {
		return null;
	}
};
