/**
 * SmartTraineeActionButton Component
 * 
 * Conditionally shows either "Create Trainee User" or "View as Trainee" button
 * based on whether the customer already has a user account.
 */

import React from 'react';
import { CreateTraineeButton } from './CreateTraineeButton';
import { ViewAsClientButton } from './ViewAsClientButton';

interface SmartTraineeActionButtonProps {
  customerId: string;
  leadId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerUserId?: string | null; // Customer's user_id if exists
  customerInvitationUserId?: string | null; // User_id from invitation if exists
}

export const SmartTraineeActionButton: React.FC<SmartTraineeActionButtonProps> = ({
  customerId,
  leadId,
  customerEmail,
  customerName,
  customerUserId,
  customerInvitationUserId,
}) => {
  // Check if user exists (either direct user_id or through invitation)
  const hasUser = !!customerUserId || !!customerInvitationUserId;
  const userId = customerUserId || customerInvitationUserId;

  // Only show ONE button at a time
  if (hasUser && userId) {
    // User exists - show "View as Trainee" button
    return (
      <ViewAsClientButton
        customerId={customerId}
        userId={userId}
      />
    );
  } else {
    // No user exists - show "Create Trainee User" button
    return (
      <CreateTraineeButton
        customerId={customerId}
        leadId={leadId || null}
        customerEmail={customerEmail || null}
        customerName={customerName || null}
      />
    );
  }
};


