import React from 'react';
import { useDevMode } from '@/hooks/useDevMode';
import { cn } from '@/lib/utils';

interface DevModeIdProps {
  id: string | number | null | undefined;
  className?: string;
  truncate?: boolean;
  maxLength?: number;
}

/**
 * DevModeId Component
 * Conditionally displays IDs only when dev mode is enabled
 * Press D+E+V keys in sequence to toggle dev mode
 */
export const DevModeId: React.FC<DevModeIdProps> = ({
  id,
  className,
  truncate = true,
  maxLength = 8,
}) => {
  const { devMode } = useDevMode();

  if (!devMode || !id) {
    return null;
  }

  const idString = String(id);
  const displayId = truncate && idString.length > maxLength
    ? `${idString.substring(0, maxLength)}...`
    : idString;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono',
        'bg-gray-100 text-gray-600 border border-gray-200',
        className
      )}
      title={idString}
    >
      {displayId}
    </span>
  );
};
