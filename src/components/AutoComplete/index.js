import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';

const styles = theme => ({
	input: {
		paddingBottom: theme.spacing.unit
	}
});

export function AutoComplete ({
	classes,
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
			renderInput={(params) => <TextField className={classes.input} {...params} placeholder={placeholder} />}
			freeSolo
			fullWidth
    />
  );
}

AutoComplete.propTypes = {
	classes: PropTypes.object.isRequired,
	items: PropTypes.array.isRequired,
	onChange: PropTypes.func.isRequired,
	placeholder: PropTypes.string.isRequired,
	onInputChange: PropTypes.func,
	value: PropTypes.string
};

export default withStyles(styles)(AutoComplete);
