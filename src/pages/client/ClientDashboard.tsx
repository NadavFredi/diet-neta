/**
 * ClientDashboard Page
 * 
 * Main entry point for client dashboard.
 * Separates view (ClientDashboardView) from routing/guards.
 */

import React from 'react';
import ClientProtectedRoute from '@/components/ClientProtectedRoute';
import { ClientDashboardView } from './ClientDashboardView';

const ClientDashboard: React.FC = () => {
  return (
    <ClientProtectedRoute>
      <ClientDashboardView />
    </ClientProtectedRoute>
  );
};

export default ClientDashboard;

