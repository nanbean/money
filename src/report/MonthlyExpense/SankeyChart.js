import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import ReactECharts from 'echarts-for-react';
import useDarkMode from '../../hooks/useDarkMode';
import { toCurrencyFormat } from '../../utils/formatting';

const SankeyChart = ({ data }) => {
	const isDarkMode = useDarkMode();
	const { currency: displayCurrency, exchangeRate } = useSelector((state) => state.settings);

	const { nodes, links } = useMemo(() => {
		if (!data || data.length <= 1) {
			return { nodes: [], links: [] };
		}

		const chartLinks = data.slice(1).map(([source, target, value]) => ({
			source,
			target,
			value: displayCurrency === 'USD' && exchangeRate ? value / exchangeRate : value
		}));

		const nodeSet = new Set();
		chartLinks.forEach(link => {
			nodeSet.add(link.source);
			nodeSet.add(link.target);
		});

		const chartNodes = Array.from(nodeSet).map(name => ({ name }));

		return { nodes: chartNodes, links: chartLinks };
	}, [data, displayCurrency, exchangeRate]);

	const option = {
		backgroundColor: 'transparent',
		tooltip: {
			trigger: 'item',
			triggerOn: 'mousemove',
			formatter: (params) => {
				const { dataType, data, value, name } = params;
				if (dataType === 'edge') {
					return `${data.source} → ${data.target}<br/>${toCurrencyFormat(value)}`;
				}
				if (dataType === 'node') {
					return `${name}<br/>${toCurrencyFormat(value)}`;
				}
				return '';
			}
		},
		series: [
			{
				type: 'sankey',
				data: nodes,
				links: links,
				emphasis: {
					focus: 'adjacency'
				},
				lineStyle: {
					color: 'gradient',
					curveness: 0.5
				},
				label: {
					color: isDarkMode ? '#fff' : '#000'
				}
			}
		]
	};

	if (nodes.length === 0) {
		return null;
	}

	return (
		<ReactECharts
			option={option}
			style={{ height: '100%', width: '100%' }}
		/>
	);
};

SankeyChart.propTypes = {
	data: PropTypes.array.isRequired
};

export default SankeyChart;