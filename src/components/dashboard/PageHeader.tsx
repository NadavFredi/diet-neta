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
        'border-b border-indigo-200/60',
        'p-6',
        'overflow-hidden',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, rgb(224, 231, 255) 0%, rgb(199, 210, 254) 50%, rgb(165, 180, 252) 100%)',
      }}
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
                    <span className="mx-2 text-indigo-300">/</span>
                  )}
                  <span className={cn(
                    'font-medium',
                    index === breadcrumbs.length - 1 
                      ? 'text-indigo-800' 
                      : 'text-indigo-600/80 hover:text-indigo-800 transition-colors'
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
              <div className="flex-shrink-0">
                <Icon 
                  className="w-7 h-7 text-indigo-600" 
                  strokeWidth={2}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-indigo-950 leading-tight tracking-tight" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-indigo-700/90 font-medium mt-1.5">
                  {subtitle}
                </p>
              )}
            </div>
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
          <div className="mt-4 pt-4 border-t border-indigo-200/40">
            {filters}
          </div>
        )}
      </div>
    </div>
  );
};
