import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { styled } from '@mui/material/styles';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import MenuIcon from '@mui/icons-material/Menu';

import { toggleSidebar } from '../../actions/uiActions';

import { logoutAction } from '../../actions/authActions';

const LoadingBarContainer = styled('div')(({ theme }) => ({
	width: '100%',
	position: 'fixed',
	zIndex: theme.zIndex.drawer + 1,
	[theme.breakpoints.down('sm')]: {
		top: 56
	},
	[theme.breakpoints.up('sm')]: {
		top: 64
	}
}));

const linkStyle = {
	textDecoration: 'none',
	color: 'inherit'
};

function TitleHeader ({
	title,
	loading
}) {
	const username = useSelector((state) => state.username);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const trascationsFetching = useSelector((state) => state.trascationsFetching);
	const updateInvestmentPriceFetching = useSelector((state) => state.updateInvestmentPriceFetching);
	const accountList = useSelector((state) => state.accountList);
	const accountType = useMemo(() => (pathname.split('/')[1] || ''), [pathname]);
	const accountName = useMemo(() => decodeURIComponent(pathname.split('/')[2] || ''), [pathname]);
	console.log('accountType', accountType, 'accountName', accountName);
	const isCashAccount = accountName.match(/_Cash/i);

	const bankAccountList = useMemo(() => {
		const validBankTypes = ['Bank', 'CCard', 'Cash'];
		return accountList
			.filter(a => validBankTypes.includes(a.type) && !a.closed && !a.name.match(/_Cash/i))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [accountList]);
	const investmentAccountList = useMemo(() => {
		const validInvstTypes = ['Invst'];
		return accountList
			.filter(a => validInvstTypes.includes(a.type) && !a.closed)
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [accountList]);
	
	const handleSignout = () => {
		dispatch(logoutAction());
	};

	const handleToggleSideBar = () => {
		dispatch(toggleSidebar());
	};

	const handleAccountChange = () => (event) => {
		const account = accountList.find(a => a.name === event.target.value);
		navigate(`/${account.type}/${account.name}`);
	};

	const renderTitleContent = () => {
		if ((accountType === 'Bank' || accountType === 'CCard' || accountType === 'Cash') && !isCashAccount) {
			return (
				<Box sx={{ ml: 2 }}>
					<FormControl>
						<Select
							value={accountName}
							onChange={handleAccountChange()}
							variant="standard"
							disableUnderline
							sx={{ '& .MuiSelect-icon': { color: 'inherit' } }}
							renderValue={(value) => (
								<Typography variant="h6" color="inherit">
									{value}
								</Typography>
							)}
						>
							{bankAccountList.map((acc) => (
								<MenuItem key={acc._id} value={acc.name}>{acc.name}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>
			);
		} else if (accountType === 'Invst') {
			return (
				<Box sx={{ ml: 2 }}>
					<FormControl>
						<Select
							value={accountName}
							onChange={handleAccountChange()}
							variant="standard"
							disableUnderline
							sx={{ '& .MuiSelect-icon': { color: 'inherit' } }}
							renderValue={(value) => (
								<Typography variant="h6" color="inherit">
									{value}
								</Typography>
							)}
						>
							{investmentAccountList.map((acc) => (
								<MenuItem key={acc._id} value={acc.name}>{acc.name}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>
			);
		} else {
			return <Typography variant="h6" color="inherit" sx={{ ml: 2 }}>{title}</Typography>;
		}
	};

	return (
		<React.Fragment>
			<AppBar
				position="fixed"
			>
				<Toolbar>
					<IconButton
						color="inherit"
						aria-label="Open drawer"
						onClick={handleToggleSideBar}
						sx={{ marginLeft: -2 }}
					>
						<MenuIcon />
					</IconButton>
					<Box sx={{ flexGrow: 1 }}>
						{renderTitleContent()}
					</Box>
					<Box>
						{
							username &&
							<Link key="/logOut" to="/" style={linkStyle}>
								<Button color="inherit" onClick={handleSignout}>Signout</Button>
							</Link>
						}
						{
							!username &&
							<Link key="/signin" to="/signin" style={linkStyle}>
								<Button color="inherit">Signin</Button>
							</Link>
						}
					</Box>
				</Toolbar>
			</AppBar>
			{
				(updateInvestmentPriceFetching || trascationsFetching || loading) &&
				<LoadingBarContainer>
					<LinearProgress color="secondary"/>
				</LoadingBarContainer>
			}
		</React.Fragment>
	);
}

TitleHeader.propTypes = {
	title: PropTypes.string.isRequired,
	loading: PropTypes.bool,
	titleContent: PropTypes.string
};

export default TitleHeader;
