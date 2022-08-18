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
	const defaultValue = value && items.length > 0 && items.find(i => i.name === value);

	return (
		<Autocomplete
			options={items}
			getOptionLabel={(option) => option.name}
			defaultValue={defaultValue}
			onInputChange={onInputChange}
			onChange={onChange}
			renderInput={(params) => <TextField {...params} variant="standard" placeholder={placeholder} />}
			freeSolo
			fullWidth
		/>
	);
}

export default AutoComplete;
