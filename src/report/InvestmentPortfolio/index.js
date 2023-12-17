import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import ReactEcharts from 'echarts-for-react'; 


function InvestmentPortfolio () {
	const accountList = useSelector((state) => state.accountList);
	const allInvestments = useMemo(() => accountList.reduce((acc, item) => {
		var investments = item.investments;
		investments.forEach(investment => {
			var existingInvestment = acc.find(el => {
				return el.name === investment.name;
			});
	
			if (existingInvestment) {
				existingInvestment.quantity += investment.quantity;
				existingInvestment.amount += investment.quantity * investment.price;
			} else {
				acc.push({
					name: investment.name,
					quantity: investment.quantity,
					price: investment.price,
					amount: investment.quantity * investment.price
				});
			}
		});
	
		return acc;
	}, []).filter(function (item) {
		return item.quantity > 0;
	}), [accountList]);

	const option = {
		tooltip: {
			trigger: 'item',
			formatter: d => `${d.value.toLocaleString()}, ${d.percent}%`
		},
		series: [
			{
				name: 'Portfolio',
				type: 'pie',
				radius: '60%',
				data: allInvestments.map(i => ({ name: i.name, value: i.amount })),
				label: {
					formatter: d => `${d.name}\n${d.percent}%`
				},
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.5)'
					}
				}
			}
		]
	};

	if (allInvestments.length > 0) {
		return <ReactEcharts option={option} />;
	}
}

export default InvestmentPortfolio;
