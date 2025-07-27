import React from 'react';
import { useSelector } from 'react-redux';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Paper } from '@mui/material';
import stringToColor from 'string-to-color';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
	const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);

	if (percent < 0.05) {
		return null;
	}

	return (
		<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
			{`${(percent * 100).toFixed(2)}%`}
		</text>
	);
};

const AssetAllocationChart = () => {
	const accountInvestments = useSelector((state) => state.accountInvestments);

	const data = React.useMemo(() => {
		if (!accountInvestments || accountInvestments.length === 0) {
			return [];
		}

		return accountInvestments
			.filter((investment) => investment.quantity > 0)
			.map((investment) => ({
				name: investment.name,
				value: investment.appraisedValue
			}));
	}, [accountInvestments]);

	if (data.length === 0) {
		return null;
	}

	return (
		<Paper elevation={2} sx={{ p: 2 }}>
			<ResponsiveContainer width="100%" height={200}>
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						outerRadius={80}
						fill="#8884d8"
						labelLine={false}
						label={renderCustomizedLabel}
					>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={stringToColor(entry.name)} />
						))}
					</Pie>
				</PieChart>
			</ResponsiveContainer>
		</Paper>
	);
};

export default AssetAllocationChart;
