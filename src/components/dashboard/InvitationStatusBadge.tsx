/**
 * InvitationStatusBadge Component
 * 
 * Displays the invitation status for a user/lead with visual indicators
 */

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Mail, RefreshCw } from 'lucide-react';
import type { InvitationStatus } from '@/store/slices/invitationSlice';

interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  invitedAt?: string;
  expiresAt?: string;
  acceptedAt?: string | null;
  className?: string;
}

const statusConfig: Record<InvitationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
  pending: {
    label: 'ממתין לשליחה',
    variant: 'outline',
    icon: <Clock className="h-3 w-3 ml-1" />,
    color: 'text-gray-600',
  },
  sent: {
    label: 'נשלח',
    variant: 'default',
    icon: <Mail className="h-3 w-3 ml-1" />,
    color: 'text-blue-600',
  },
  accepted: {
    label: 'אושר',
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3 ml-1" />,
    color: 'text-green-600',
  },
  expired: {
    label: 'פג תוקף',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3 ml-1" />,
    color: 'text-red-600',
  },
  revoked: {
    label: 'בוטל',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3 ml-1" />,
    color: 'text-red-600',
  },
};

export const InvitationStatusBadge: React.FC<InvitationStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={`${config.color} ${className} flex items-center gap-1`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};
