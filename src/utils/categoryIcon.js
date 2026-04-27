import ArchitectureIcon from '@mui/icons-material/Architecture';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SchoolIcon from '@mui/icons-material/School';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import SavingsIcon from '@mui/icons-material/Savings';
import KitchenIcon from '@mui/icons-material/Kitchen';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import GolfCourseIcon from '@mui/icons-material/GolfCourse';
import SmsIcon from '@mui/icons-material/Sms';
import MoneyIcon from '@mui/icons-material/Money';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

// Additional icons mapped from design handoff ICON_PALETTE (settings-editors.jsx)
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import EnergySavingsLeafOutlinedIcon from '@mui/icons-material/EnergySavingsLeafOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import LocalFireDepartmentOutlinedIcon from '@mui/icons-material/LocalFireDepartmentOutlined';
import WifiOutlinedIcon from '@mui/icons-material/WifiOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';

import {
	ARCHITECTURE_CATEGORY,
	EVENT_CATEGORY,
	BILL_CATEGORY,
	EDUCATION_CATEGORY,
	TRANSPORT_CATEGORY,
	ETC_EXPENSE_CATEGORY,
	LOAN_INTEREST_CATEGORY,
	BEAUTY_CATEGORY,
	INSURANCE_CATEGORY,
	HOUSEHOLD_GOODS_CATEGORY,
	TAX_CATEGORY,
	COMMISSION_CATEGORY,
	FOOD_CATEGORY,
	NON_EXPENSE_CATEGORY,
	CHILD_CARE_CATEGORY,
	MEDICAL_CATEGORY,
	CLOTH_CATEGORY,
	LEISURE_CATEGORY,
	COMMUNICATION_CATEGORY,
	FEE_CATEGORY,
	FAMILY_CATEGORY
} from '../constants';

// Picker options — 22 default icons (mapped from getCategoryIcon below) plus 25
// additional icons sourced from the design handoff ICON_PALETTE (settings-editors.jsx).
// Each option has:
//   key      — stable identifier persisted into the `categoryIcons` settings map
//   Icon     — MUI icon component
// To resolve an icon for a category at render time, prefer the user-picked value
// from `state.settings.categoryIcons[name]`; fall back to `resolveCategoryIcon` below.
export const CATEGORY_ICON_OPTIONS = [
	// — Project defaults (used by getCategoryIcon by name) —
	{ key: 'food',          Icon: RestaurantIcon },
	{ key: 'transport',     Icon: DirectionsCarIcon },
	{ key: 'education',     Icon: SchoolIcon },
	{ key: 'medical',       Icon: LocalHospitalIcon },
	{ key: 'cloth',         Icon: CheckroomIcon },
	{ key: 'beauty',        Icon: FaceRetouchingNaturalIcon },
	{ key: 'household',     Icon: KitchenIcon },
	{ key: 'family',        Icon: VolunteerActivismIcon },
	{ key: 'childCare',     Icon: ChildCareIcon },
	{ key: 'leisure',       Icon: GolfCourseIcon },
	{ key: 'event',         Icon: CardGiftcardIcon },
	{ key: 'communication', Icon: SmsIcon },
	{ key: 'bill',          Icon: ReceiptIcon },
	{ key: 'tax',           Icon: AccountBalanceIcon },
	{ key: 'insurance',     Icon: SavingsIcon },
	{ key: 'loanInterest',  Icon: CurrencyExchangeIcon },
	{ key: 'commission',    Icon: AttachMoneyIcon },
	{ key: 'fee',           Icon: MoneyIcon },
	{ key: 'architecture',  Icon: ArchitectureIcon },
	{ key: 'nonExpense',    Icon: MonetizationOnIcon },
	{ key: 'transfer',      Icon: SyncAltIcon },
	{ key: 'other',         Icon: MoreHorizIcon },
	// — Design handoff palette additions (Outlined variants) —
	{ key: 'tag',           Icon: LocalOfferOutlinedIcon },
	{ key: 'film',          Icon: MovieOutlinedIcon },
	{ key: 'home',          Icon: HomeOutlinedIcon },
	{ key: 'bolt',          Icon: BoltOutlinedIcon },
	{ key: 'scissors',      Icon: ContentCutOutlinedIcon },
	{ key: 'shield',        Icon: ShieldOutlinedIcon },
	{ key: 'leaf',          Icon: EnergySavingsLeafOutlinedIcon },
	{ key: 'users',         Icon: PeopleAltOutlinedIcon },
	{ key: 'percent',       Icon: PercentOutlinedIcon },
	{ key: 'arrowUp',       Icon: TrendingUpIcon },
	{ key: 'arrowDown',     Icon: TrendingDownIcon },
	{ key: 'cloud',         Icon: CloudOutlinedIcon },
	{ key: 'music',         Icon: MusicNoteOutlinedIcon },
	{ key: 'note',          Icon: StickyNote2OutlinedIcon },
	{ key: 'sparkles',      Icon: AutoAwesomeOutlinedIcon },
	{ key: 'flame',         Icon: LocalFireDepartmentOutlinedIcon },
	{ key: 'wifi',          Icon: WifiOutlinedIcon },
	{ key: 'truck',         Icon: LocalShippingOutlinedIcon },
	{ key: 'globe',         Icon: PublicOutlinedIcon },
	{ key: 'play',          Icon: PlayArrowOutlinedIcon },
	{ key: 'card',          Icon: CreditCardOutlinedIcon },
	{ key: 'cash',          Icon: PaymentsOutlinedIcon },
	{ key: 'chart',         Icon: BarChartOutlinedIcon },
	{ key: 'minus',         Icon: RemoveOutlinedIcon },
	{ key: 'plus',          Icon: AddOutlinedIcon }
];

const ICON_BY_KEY = Object.fromEntries(CATEGORY_ICON_OPTIONS.map(o => [o.key, o.Icon]));

// Resolve to an Icon component given an optional user-picked key + the category name.
// Prefers user pick, then falls back to name-based default mapping.
// Matches on the BASE category — `name.split(':')[0]` — so subcategory paths like
// "교통비:차량유지비" still resolve to the TRANSPORT_CATEGORY icon.
export function resolveCategoryIcon (name, pickedKey) {
	if (pickedKey && ICON_BY_KEY[pickedKey]) return ICON_BY_KEY[pickedKey];
	if (name && name.startsWith('[')) return SyncAltIcon;
	const base = (name || '').split(':')[0];
	switch (base) {
	case ARCHITECTURE_CATEGORY: return ArchitectureIcon;
	case EVENT_CATEGORY:        return CardGiftcardIcon;
	case BILL_CATEGORY:         return ReceiptIcon;
	case EDUCATION_CATEGORY:    return SchoolIcon;
	case TRANSPORT_CATEGORY:    return DirectionsCarIcon;
	case ETC_EXPENSE_CATEGORY:  return MoreHorizIcon;
	case LOAN_INTEREST_CATEGORY: return CurrencyExchangeIcon;
	case BEAUTY_CATEGORY:       return FaceRetouchingNaturalIcon;
	case INSURANCE_CATEGORY:    return SavingsIcon;
	case HOUSEHOLD_GOODS_CATEGORY: return KitchenIcon;
	case TAX_CATEGORY:          return AccountBalanceIcon;
	case COMMISSION_CATEGORY:   return AttachMoneyIcon;
	case FOOD_CATEGORY:         return RestaurantIcon;
	case NON_EXPENSE_CATEGORY:  return MonetizationOnIcon;
	case CHILD_CARE_CATEGORY:   return ChildCareIcon;
	case MEDICAL_CATEGORY:      return LocalHospitalIcon;
	case CLOTH_CATEGORY:        return CheckroomIcon;
	case LEISURE_CATEGORY:      return GolfCourseIcon;
	case COMMUNICATION_CATEGORY: return SmsIcon;
	case FEE_CATEGORY:          return MoneyIcon;
	case FAMILY_CATEGORY:       return VolunteerActivismIcon;
	default:                    return MoreHorizIcon;
	}
}

export function getCategoryIcon (category, fontsize) {
	const sx = fontsize ? { fontSize: fontsize } : {};
	const Icon = resolveCategoryIcon(category);
	return <Icon sx={sx} />;
}