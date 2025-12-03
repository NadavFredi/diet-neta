import { useDashboard } from '@/hooks/useDashboard';

export const useDashboardPage = () => {
  const dashboard = useDashboard();

  return {
    ...dashboard,
  };
};

