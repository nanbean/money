import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Autocomplete from 'react-autocomplete';
import TextField from '@material-ui/core/TextField';

// TODO delete index.css and apply style in js

const styles = theme => ({
	input: {
		paddingBottom: theme.spacing.unit
	}
});

class AutoComplete extends Component {
	matchStateToTerm = (state, value) => state.key.toLowerCase().indexOf(value.toLowerCase()) !== -1 || 	state.name.toLowerCase().indexOf(value.toLowerCase()) !== -1

	render () {
		const { classes, value, items, placeholder, onChange, onSelect } = this.props;

		return (
			<Autocomplete
				value={value}
				items={items}
				getItemValue={(item) => item.name}
				shouldItemRender={this.matchStateToTerm}
				onChange={onChange}
				onSelect={onSelect}
				wrapperStyle={{ }}
				renderInput={props => {
					const { ref, ...rest } = props;
					return (
						<TextField className={classes.input} {...rest} inputRef={ref}
							id="my-component"
							value={value}
							placeholder={placeholder}
							fullWidth
						/>
					);
				}}
				renderMenu={children => (
					<div className="autocomplete-menu">
						{children}
					</div>
				)}
				renderItem={(item, isHighlighted) =>
					<div
						className={`autocomplete-item ${isHighlighted ? 'autocomplete-item-highlighted' : ''}`}
						key={item.name}
					>
						{item.name}
					</div>
				}
			/>
		);
	}
}

AutoComplete.propTypes = {
	classes: PropTypes.object.isRequired,
	items: PropTypes.array.isRequired,
	onChange: PropTypes.func.isRequired,
	onSelect: PropTypes.func.isRequired,
	placeholder: PropTypes.string.isRequired,
	value: PropTypes.string
};

export default withStyles(styles)(AutoComplete);
