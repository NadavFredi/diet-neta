import { useLeadDetails } from '@/hooks/useLeadDetails';
import { useLeadStatus } from '@/hooks/useLeadStatus';

export const useLeadDetailsPage = () => {
  const leadDetails = useLeadDetails();
  const statusManagement = useLeadStatus(leadDetails.lead?.id, leadDetails.lead?.status || '');

  return {
    ...leadDetails,
    ...statusManagement,
  };
};


