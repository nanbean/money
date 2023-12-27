import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import ReactEcharts from 'echarts-for-react'; 

import AccountFilter from '../../components/AccountFilter';

function InvestmentPortfolio () {
	const accountList = useSelector((state) => state.accountList);
	const allAccounts = accountList.filter(i => i.type === 'Invst' && !i.closed).map(j => j.name);
	const [filteredAccounts, setFilteredAccounts] = useState(allAccounts);
	const allInvestments = useMemo(() => accountList.filter(i => filteredAccounts.find(j => j === i.name)).reduce((acc, item) => {
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
	}), [accountList, filteredAccounts]);

	const onFilteredAccountsChange = (e) => {
		setFilteredAccounts(e);
	};

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

	return (
		<React.Fragment>
			<div>
				<AccountFilter
					allAccounts={allAccounts}
					filteredAccounts={filteredAccounts}
					setfilteredAccounts={onFilteredAccountsChange}
				/>
			</div>
			{
				allInvestments.length > 0 && <ReactEcharts option={option} />
			}
		</React.Fragment>
	);
}

export default InvestmentPortfolio;
