const moment = require('moment-timezone');
const calendar = require('./calendar');

// 장 마감 직후 스케줄러가 정규장 종가를 잡을 수 있도록 두는 여유.
// KR 크론은 마감 +30초(15:30:30 KST)에 돈다. NXT 애프터마켓이 15:40 에 열리므로
// 그 전에 끊어야 해서 넉넉하게 잡지 않는다. 이 창을 놓치면 가격은 직전 정규장
// 종가로 남는다(장외 값으로 덮이지는 않는다).
const CLOSE_GRACE_MINUTES = 2;

const hm = (h, m) => h * 60 + m;

const inSession = (marketNow, openMin, closeMin) => {
	const day = marketNow.day();
	if (day === 0 || day === 6) return false;
	const cur = marketNow.hour() * 60 + marketNow.minute();
	return cur >= openMin && cur < closeMin + CLOSE_GRACE_MINUTES;
};

// KRX 정규장 09:00 ~ 15:30 (Asia/Seoul)
//
// 미국장용 판정 함수는 두지 않는다. 미국 종목은 장외 갱신을 허용하기 때문이다
// (investmentService 주석 참고).
const isKrRegularSession = (now = moment()) => {
	if (calendar.isHoliday()) return false;
	return inSession(moment(now).tz('Asia/Seoul'), hm(9, 0), hm(15, 30));
};

module.exports = {
	CLOSE_GRACE_MINUTES,
	isKrRegularSession
};
