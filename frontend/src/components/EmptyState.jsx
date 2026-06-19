import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageOpen, title = 'No data found', description = '', action, className = '' }) {
  const isElement = Icon && typeof Icon === 'object' && Icon.$$typeof === Symbol.for('react.element');
  const isComponent = !isElement;

  return (
    <div id="empty-state" className={`flex flex-col items-center justify-center py-16 px-4 animate-fade-in ${className}`}>
      <div className="w-20 h-20 rounded-2xl bg-dark-800/50 flex items-center justify-center mb-6">
        {isComponent ? (
          <Icon className="w-10 h-10 text-dark-500" />
        ) : (
          Icon
        )}
      </div>
      <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
      {description && (
        <p className="text-dark-400 text-sm text-center max-w-md mb-6">{description}</p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
