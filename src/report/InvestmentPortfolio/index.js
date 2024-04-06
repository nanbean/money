import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import ReactEcharts from 'echarts-for-react'; 

import stc from 'string-to-color';

import AccountFilter from '../../components/AccountFilter';

import { toCurrencyFormat } from '../../utils/formatting';

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
				existingInvestment.children.push({
					account: item.name,
					name: investment.name,
					quantity: investment.quantity,
					price: investment.price,
					amount: investment.quantity * investment.price
				});
			} else {
				acc.push({
					name: investment.name,
					quantity: investment.quantity,
					price: investment.price,
					amount: investment.quantity * investment.price,
					children: [
						{
							account: item.name,
							name: investment.name,
							quantity: investment.quantity,
							price: investment.price,
							amount: investment.quantity * investment.price
						}
					]
				});
			}
		});
	
		return acc;
	}, []).filter(function (item) {
		return item.quantity > 0;
	}).sort((a, b) => {
		if (a.amount < b.amount) {
			return 1;
		}
		if (b.amount < a.amount) {
			return -1;
		}
		return 0;
	}), [accountList, filteredAccounts]);
	const color =  useMemo(() => {
		return allInvestments.map(i => stc(i.name));
	}, [allInvestments]);
	const totalAmount = useMemo(() => {
		return allInvestments.reduce((acc, item) => acc + item.amount, 0);
	}, [allInvestments]);

	const onFilteredAccountsChange = (e) => {
		setFilteredAccounts(e);
	};

	const option = {
		tooltip: {
			trigger: 'item',
			formatter: d => `${d.name}\n${toCurrencyFormat(d.value)}\n${(d.value / totalAmount* 100).toFixed(3)}%`
		},
		series: [
			{
				name: 'Portfolio',
				type: 'treemap',
				height: '95%',
				breadcrumb: {
					show: false
				},
				label: {
					show: true,
					formatter: d => `${d.name}\n${(d.value / totalAmount* 100).toFixed(3)}%`
				},
				data: allInvestments.map(i => ({
					name: i.name,
					value: i.amount,
					children: i.children.map(j => ({ name: j.account, value: j.amount }))
				})),
				levels: [
					{
						itemStyle: {
							color: '#000'
						},
						upperLabel: {
							show: false
						},
						color,
						colorMappingBy: 'id'
					},
					{
						itemStyle: {
							borderColor: '#555'
						},
						upperLabel: {
							show: true,
							height: 30
						}
					}
				]
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
				allInvestments.length > 0 && <ReactEcharts option={option} style={{ height: '600px' }} />
			}
		</React.Fragment>
	);
}

export default InvestmentPortfolio;
