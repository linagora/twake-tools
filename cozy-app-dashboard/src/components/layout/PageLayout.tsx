/**
 * PageLayout component - Main page container with consistent styling
 */

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 ml-64">
      <div className="max-w-7xl mx-auto px-6 py-12">{children}</div>
    </div>
  );
}
