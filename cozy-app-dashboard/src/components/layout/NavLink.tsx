/**
 * NavLink component - Sidebar navigation link with active state styling
 */

import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface NavLinkProps {
  to: string;
  icon: ReactNode;
  label: string;
}

export function NavLink({ to, icon, label }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
      activeProps={{
        className:
          'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
        'aria-current': 'page',
      }}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}
