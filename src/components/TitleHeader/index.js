import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {Icon, Header} from 'semantic-ui-react';

import {toggleSidebar} from '../../actions/uiActions';

import './index.css';

const TitleHeader = ({
	title,
	toggleSidebar
}) => (
	<header>
		<Header>
			<Icon name="bars" onClick={toggleSidebar} />
			<Header.Content as="h2">{title}</Header.Content>
		</Header>
	</header>
);

TitleHeader.propTypes = {
	title: PropTypes.string,
	toggleSidebar: PropTypes.func
};

export default connect(
	null,
	{toggleSidebar}
)(TitleHeader);
