import React from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export function AutoComplete ({
	items,
	onChange,
	onInputChange,
	placeholder,
	value
}) {
	return (
		<Autocomplete
			options={items}
			getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
			inputValue={value || ''}
			onInputChange={onInputChange}
			onChange={onChange}
			renderInput={(params) => <TextField {...params} variant="standard" placeholder={placeholder} />}
			freeSolo
			fullWidth
		/>
	);
}

export default AutoComplete;
