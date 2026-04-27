import { useSelector } from 'react-redux';

// Resolves the active dark/light mode from the user's themeMode setting.
// Per the redesign handoff (design_handoff_money_app/README.md), the app ships dark
// + indigo accent by default. Light mode is opt-in via settings.
const useDarkMode = () => {
	const themeMode = useSelector((state) => state.settings?.themeMode);
	if (themeMode === 'light') return false;
	return true;
};

export default useDarkMode;
