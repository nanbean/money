import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';

import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';

import { hideToast } from '../../actions/toastActions';

// 앱 전역 알림. 액션 thunk에서 showToast()를 dispatch하면 여기서 노출된다.
function GlobalToast () {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { open, message, severity, actionType } = useSelector((state) => state.toast);

	const onClose = (event, reason) => {
		// 스낵바 밖을 눌렀다고 닫히면 알림을 놓치기 쉬우므로 clickaway는 무시한다.
		if (reason === 'clickaway') {
			return;
		}
		dispatch(hideToast());
	};

	const onSignin = () => {
		dispatch(hideToast());
		navigate('/signin');
	};

	return (
		<Snackbar
			open={open}
			autoHideDuration={actionType ? null : 5000}
			onClose={onClose}
			anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			sx={{
				// 모바일 하단 네비게이션 위로 띄운다.
				bottom: { xs: 'calc(72px + env(safe-area-inset-bottom))', md: 24 }
			}}
		>
			<Alert
				onClose={onClose}
				severity={severity}
				variant="filled"
				sx={{ width: '100%' }}
				action={actionType === 'signin' ? (
					<>
						<Button color="inherit" size="small" onClick={onSignin}>
							로그인
						</Button>
						<IconButton color="inherit" size="small" onClick={onClose} aria-label="close">
							<CloseOutlinedIcon fontSize="small" />
						</IconButton>
					</>
				) : undefined}
			>
				{message}
			</Alert>
		</Snackbar>
	);
}

export default GlobalToast;
