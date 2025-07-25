import React from 'react';

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
	FEE_CATEGORY
} from '../constants';

export function getCategoryIcon (category, fontsize) {
	const sx = {};
	
	if (fontsize) {
		sx.fontSize = fontsize;
	}

	if (category && category.startsWith('[')) {
		return <SyncAltIcon sx={sx} />;
	}

	switch (category) {
	case ARCHITECTURE_CATEGORY:
		return <ArchitectureIcon sx={sx} />;
	case EVENT_CATEGORY:
		return <CardGiftcardIcon sx={sx} />;
	case BILL_CATEGORY:
		return <ReceiptIcon sx={sx} />;
	case EDUCATION_CATEGORY:
		return <SchoolIcon sx={sx} />;
	case TRANSPORT_CATEGORY:
		return <DirectionsCarIcon sx={sx} />;
	case ETC_EXPENSE_CATEGORY:
		return <MoreHorizIcon sx={sx} />;
	case LOAN_INTEREST_CATEGORY:
		return <CurrencyExchangeIcon sx={sx} />;
	case BEAUTY_CATEGORY:
		return <FaceRetouchingNaturalIcon sx={sx} />;
	case INSURANCE_CATEGORY:
		return <SavingsIcon sx={sx} />;
	case HOUSEHOLD_GOODS_CATEGORY:
		return <KitchenIcon sx={sx} />;
	case TAX_CATEGORY:
		return <AccountBalanceIcon sx={sx} />;
	case COMMISSION_CATEGORY:
		return <AttachMoneyIcon sx={sx} />;
	case FOOD_CATEGORY:
		return <RestaurantIcon sx={sx} />;
	case NON_EXPENSE_CATEGORY:
		return <MonetizationOnIcon sx={sx} />;
	case CHILD_CARE_CATEGORY:
		return <ChildCareIcon sx={sx} />;
	case MEDICAL_CATEGORY:
		return <LocalHospitalIcon sx={sx} />;
	case CLOTH_CATEGORY:
		return <CheckroomIcon sx={sx} />;
	case LEISURE_CATEGORY:
		return <GolfCourseIcon sx={sx} />;
	case COMMUNICATION_CATEGORY:
		return <SmsIcon sx={sx} />;
	case FEE_CATEGORY:
		return <MoneyIcon sx={sx} />;
	default:
		return <MoreHorizIcon sx={sx} />;
	}
}