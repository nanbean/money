import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Autocomplete from 'react-autocomplete';

import './index.css';

class AutoComplete extends Component {
	matchStateToTerm = (state, value) => state.key.toLowerCase().indexOf(value.toLowerCase()) !== -1 || 	state.name.toLowerCase().indexOf(value.toLowerCase()) !== -1

	render () {
		const { value, items, placeholder, onChange, onSelect } = this.props;

		return (
			<Autocomplete
				className='input-fluid'
				value={value}
				items={items}
				getItemValue={(item) => item.name}
				shouldItemRender={this.matchStateToTerm}
				onChange={onChange}
				onSelect={onSelect}
				wrapperStyle={{ }}
				renderInput={(props) => <div className='ui input full-width'><input placeholder={placeholder} {...props} /></div>}
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
	value: PropTypes.string,
	items: PropTypes.array.isRequired,
	placeholder: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	onSelect: PropTypes.func.isRequired
};

export default AutoComplete;
