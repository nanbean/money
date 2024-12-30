import * as React from 'react';

const useHeight = () => {
	const [windowHeight, setWindowHeight] = React.useState(window.innerHeight);

	React.useEffect(() => {
		const handleResize = () => {
			setWindowHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);
		// 컴포넌트가 unmount될 때 event listener를 제거합니다.
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return windowHeight;
};

export default useHeight;