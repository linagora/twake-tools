/**
 * StatCard component - Display metric cards with icon, label, and value
 */

import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
}

export function StatCard({
  icon,
  label,
  value,
  valueColor = 'text-white',
}: StatCardProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}
