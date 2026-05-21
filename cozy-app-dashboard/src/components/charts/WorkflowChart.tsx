/**
 * WorkflowChart component - Workflow duration line chart
 */

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface WorkflowChartDataPoint {
  month: string;
  averageDuration: number;
  totalRuns: number;
}

interface WorkflowChartProps {
  data: WorkflowChartDataPoint[];
}

export function WorkflowChart({ data }: WorkflowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="month"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF' }}
          label={{
            value: 'Average Duration (minutes)',
            angle: -90,
            position: 'insideLeft',
            fill: '#9CA3AF',
          }}
          domain={[0, 10]}
          allowDecimals={true}
          tickFormatter={(value) => value.toFixed(1)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'Avg Duration (min)') {
              return [`${value.toFixed(2)} min`, 'Avg Duration'];
            }
            if (name === 'Run Count') {
              return [value, 'Run Count'];
            }
            return [value, name];
          }}
        />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} iconType="line" />
        <Line
          type="monotone"
          dataKey="averageDuration"
          stroke="#06B6D4"
          strokeWidth={2}
          dot={{ fill: '#06B6D4', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls={true}
          name="Avg Duration (min)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
