import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Checkbox} from 'semantic-ui-react';

import './index.css';

class InvestmentFilter extends Component {
	constructor (props) {
		super(props);

		this.onFilteredInvestmentsChange = this.onFilteredInvestmentsChange.bind(this);
		this.onAllInvestementClick = this.onAllInvestementClick.bind(this);
	}

	onFilteredInvestmentsChange (e, data) {
		const {filteredInvestments} = this.props;
		const investment = data.label;
		const checked = data.checked;

		const findIndex = filteredInvestments.findIndex(i => i === investment);

		if ( checked === true) {
			if (findIndex >= 0) {
				// do nothing
			} else {
				this.props.setfilteredInvestments([
					...filteredInvestments,
					investment
				]);
			}
		} else if (findIndex >= 0) {
			this.props.setfilteredInvestments([
				...filteredInvestments.slice(0, findIndex),
				...filteredInvestments.slice(findIndex + 1)
			]);
		} else {
			// do nothing
		}
	}

	onAllInvestementClick (e, data) {
		const checked = data.checked;
		const {allInvestmentsPrice} = this.props;
		const allInvestments = allInvestmentsPrice.map(j => j.investment);

		if ( checked === true) {
			this.props.setfilteredInvestments([
				...allInvestments
			]);
		} else {
			this.props.setfilteredInvestments([
			]);
		}
	}

	render () {
		const {allInvestmentsPrice, filteredInvestments, allInvestmentsFiltered} = this.props;

		return (
			<div className="investment-filter">
				{
					allInvestmentsPrice && allInvestmentsPrice.map(j => {
						return (
							<div key={j.investment} className="investment-filter-checkbox">
								<Checkbox key={j.investment} label={j.investment} checked={filteredInvestments.find(q => q === j.investment) ? true : false} onChange={this.onFilteredInvestmentsChange}/>
							</div>
						);
					})
				}
				<Checkbox key="All" label="All" checked={allInvestmentsFiltered} onClick={this.onAllInvestementClick}/>
			</div>
		);
	}
}

InvestmentFilter.propTypes = {
	allInvestmentsFiltered: PropTypes.bool.isRequired,
	allInvestmentsPrice: PropTypes.array.isRequired,
	filteredInvestments: PropTypes.array.isRequired,
	setfilteredInvestments: PropTypes.func.isRequired
};

export default InvestmentFilter;
