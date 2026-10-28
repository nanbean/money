import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

// 가로 스크롤 줄(탭·카드). 모바일에서 끝 항목이 잘려 보이는 것은 '옆에 더 있다'는
// 신호(peek)라 그대로 두되, 잘린 쪽을 서서히 흐리게 해서 깨진 레이아웃이 아니라
// 의도된 것으로 읽히게 한다. 페이드는 더 볼 내용이 있는 쪽에만 생긴다.
//
// - 스크롤바는 숨긴다 (페이드가 스크롤 가능하다는 신호를 대신한다)
// - 손을 떼면 항목 가장자리에 맞춰 멈춘다 (scroll-snap). 항목에 data-snap 을 줄 필요는
//   없고 직계 자식이 스냅 대상이다
// - activeKey 가 바뀌면 data-active="true" 인 자식을 가운데로 옮긴다
//
// mask 는 이 요소의 내용에만 걸린다. 테두리·배경이 있는 상자라면 그 상자 안쪽에 둔다.
const FADE = 24;

export function FadeScroller ({ children, activeKey, gap = '6px', padding = 0, sx }) {
	const ref = useRef(null);
	const [edges, setEdges] = useState({ left: false, right: false });

	const update = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const left = el.scrollLeft > 2;
		const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
		setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		update();
		if (typeof ResizeObserver === 'undefined') return undefined;
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [update]);

	useEffect(() => {
		const el = ref.current;
		const active = el && el.querySelector('[data-active="true"]');
		if (!el || !active) return;
		el.scrollLeft = active.offsetLeft - (el.clientWidth - active.clientWidth) / 2;
		update();
	}, [activeKey, update]);

	const mask = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${edges.right ? 'transparent' : '#000'} 100%)`;

	return (
		<Box
			ref={ref}
			onScroll={update}
			sx={{
				display: 'flex',
				gap,
				padding,
				overflowX: 'auto',
				overflowY: 'hidden',
				scrollbarWidth: 'none',
				'&::-webkit-scrollbar': { display: 'none' },
				WebkitOverflowScrolling: 'touch',
				scrollSnapType: 'x proximity',
				scrollPaddingInline: padding,
				'& > *': { flexShrink: 0, scrollSnapAlign: 'start' },
				// 마지막 항목까지 밀었을 때 오른쪽 끝에 붙지 않게. flex 스크롤 컨테이너의
				// padding-right 는 일부 브라우저(Safari)에서 무시되므로 빈 항목으로 둔다.
				'&::after': { content: '""', flex: `0 0 ${typeof padding === 'number' ? `${padding || 1}px` : padding}` },
				maskImage: mask,
				WebkitMaskImage: mask,
				...sx
			}}
		>
			{children}
		</Box>
	);
}

FadeScroller.propTypes = {
	activeKey: PropTypes.string,
	children: PropTypes.node,
	gap: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	padding: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	sx: PropTypes.object
};

export default FadeScroller;
