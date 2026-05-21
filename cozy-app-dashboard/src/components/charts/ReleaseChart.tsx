/**
 * ReleaseChart component - Monthly release activity bar chart
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyStats } from '../../data/transforms/calculateMonthlyStats';

interface ReleaseChartProps {
  data: MonthlyStats[];
}

export function ReleaseChart({ data }: ReleaseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
        <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
        />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} iconType="circle" />
        <Bar dataKey="beta" fill="#EAB308" name="Beta" />
        <Bar dataKey="stable" fill="#22C55E" name="Stable" />
      </BarChart>
    </ResponsiveContainer>
  );
}
