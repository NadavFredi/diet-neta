import { useLeadDetails } from '@/hooks/useLeadDetails';

export const useLeadDetailsPage = () => {
  const leadDetails = useLeadDetails();

  return {
    ...leadDetails,
  };
};

