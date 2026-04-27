import { useSelector } from 'react-redux';
import useDarkMode from './useDarkMode';
import { tokens } from '../utils/designTokens';

// Returns the resolved design tokens object — combines dark/light from useDarkMode +
// the user-selected accent name from `state.settings.accent` (defaulting to 'indigo').
//
// Use this in components instead of the manual pair:
//     const isDark = useDarkMode();
//     const T = tokens(isDark, 'indigo');
//
// becomes:
//     const T = useT();
//
// `T.dark` is still available for theme-mode branching.
export default function useT () {
	const isDark = useDarkMode();
	const accent = useSelector((state) => state.settings?.accent) || 'indigo';
	return tokens(isDark, accent);
}
