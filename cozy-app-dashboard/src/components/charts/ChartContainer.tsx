/**
 * ChartContainer component - Wrapper for charts with consistent styling
 */

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

export function ChartContainer({ title, children }: ChartContainerProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}
