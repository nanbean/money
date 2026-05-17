import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router v6 doesn't auto-scroll on route change (SPAs preserve the
// previous page's scroll position). Mount once near the BrowserRouter so
// every navigation lands at the top of the new page.
function ScrollToTop () {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
	}, [pathname]);
	return null;
}

export default ScrollToTop;
