import { type ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
}

export function PlaceholderPage({ title, subtitle, icon }: PlaceholderPageProps) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="card">
        <div className="empty-state py-16">
          {icon || <Construction size={48} className="mb-4 text-surface-300" />}
          <p className="text-lg font-medium text-surface-500 mt-2">Em desenvolvimento</p>
          <p className="text-sm text-surface-400 mt-1">
            Esta funcionalidade será implementada nas próximas etapas.
          </p>
        </div>
      </div>
    </div>
  );
}
