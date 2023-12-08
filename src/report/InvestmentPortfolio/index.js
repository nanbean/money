import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import stc from 'string-to-color';

const RADIAN = Math.PI / 180;
 
// eslint-disable-next-line react/prop-types
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
	const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);

	return (
		<text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
			{`${(percent * 100).toFixed(0)}% ${name}`}
		</text>
	);
};

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

	if (allInvestments.length > 0) {
		return (
			<React.Fragment>
				<ResponsiveContainer width="100%" height={600}>
					<PieChart>
						<Pie
							data={allInvestments}
							cx="50%"
							cy="50%"
							labelLine={false}
							label={renderCustomizedLabel}
							outerRadius={180}
							fill="#8884d8"
							dataKey="amount"
						>
							{allInvestments.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={stc(entry.name)} />
							))}
						</Pie>
					</PieChart>
				</ResponsiveContainer>
			</React.Fragment>
		);
	}
}

export default InvestmentPortfolio;
