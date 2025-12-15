/**
 * PageHeader Component
 * 
 * Brand-Infused Gradient Header - The "Hero" Container.
 * Premium dashboard header with vibrant gradient, duotone icon watermark,
 * and integrated controls. Acts as the colored architectural crown of the content panel.
 */

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const PageHeader = ({ 
  title, 
  subtitle, 
  breadcrumbs, 
  actions,
  filters,
  icon: Icon,
  className 
}: PageHeaderProps) => {
  return (
    <div 
      className={cn(
        'relative',
        'border-b border-slate-200',
        'p-6',
        'bg-white',
        className
      )}
      dir="rtl"
    >
      {/* Content Container */}
      <div className="relative">
        {/* Optional Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-3" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-slate-300">/</span>
                  )}
                  <span className={cn(
                    'font-medium',
                    index === breadcrumbs.length - 1 
                      ? 'text-indigo-700' 
                      : 'text-slate-500 hover:text-indigo-600 transition-colors'
                  )}>
                    {crumb}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Top Row: Title and Primary Actions */}
        <div className="flex items-center justify-between gap-6 mb-4">
          {/* Title Section (Right side in RTL) */}
          <div className="flex-1 min-w-0 flex items-center gap-3">
            {Icon && (
              <div className="flex-shrink-0 flex items-center">
                <Icon 
                  className="w-8 h-8 text-indigo-600" 
                  strokeWidth={2.5}
                />
              </div>
            )}
            <div className="flex-1 min-w-0 flex items-center">
              <h1 
                className="text-xl font-bold text-black leading-none tracking-tight inline-block px-3 py-1.5 rounded-lg border-2"
                style={{
                  borderColor: 'rgb(99, 102, 241)',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                }}
              >
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="text-sm text-slate-600 font-medium ml-3">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Actions Section (Left side in RTL) */}
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Bottom Row: Filters / Search (Optional) */}
        {filters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            {filters}
          </div>
        )}
      </div>
    </div>
  );
};
