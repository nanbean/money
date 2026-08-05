import React from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export function AutoComplete ({
	items,
	onChange,
	onInputChange,
	onEnter,
	onBlur,
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
			renderInput={(params) => (
				<TextField
					{...params}
					variant="standard"
					placeholder={placeholder}
					onKeyDown={(e) => {
						// freeSolo: a typed value not in the options list isn't committed on
						// Enter, so the keypress falls through to the enclosing <form> and
						// submits it. When onEnter is provided, intercept Enter to commit the
						// typed value (fill the form) instead of submitting.
						if (e.key === 'Enter' && onEnter) {
							e.preventDefault();
							onEnter(e.target.value);
						}
					}}
					inputProps={{
						...params.inputProps,
						onBlur: (e) => {
							// Preserve MUI's own blur handling (popup close, input reset)...
							if (params.inputProps.onBlur) params.inputProps.onBlur(e);
							// ...then let the caller normalize the typed value on blur.
							if (onBlur) onBlur(e.target.value);
						}
					}}
				/>
			)}
			freeSolo
			fullWidth
		/>
	);
}

export default AutoComplete;
