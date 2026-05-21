/**
 * PageHeader component - Consistent page title and description
 */

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-12">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
        {title}
      </h1>
      <p className="text-gray-400 text-lg">{description}</p>
    </div>
  );
}
