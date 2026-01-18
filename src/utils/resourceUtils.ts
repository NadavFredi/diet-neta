/**
 * Resource Utilities
 * 
 * Helper functions to determine the current resource key from the route.
 */

export const getResourceKeyFromPath = (pathname: string): string | null => {
  if (pathname === '/dashboard' || pathname.startsWith('/leads/') || pathname.startsWith('/profile/')) {
    return 'leads';
  }
  if (pathname.startsWith('/dashboard/customers')) {
    return 'customers';
  }
  if (pathname.startsWith('/dashboard/meetings')) {
    return 'meetings';
  }
  if (pathname.startsWith('/dashboard/templates')) {
    return 'templates';
  }
  if (pathname.startsWith('/dashboard/nutrition-templates')) {
    return 'nutrition_templates';
  }
  if (pathname.startsWith('/dashboard/budgets')) {
    return 'budgets';
  }
  if (pathname.startsWith('/dashboard/payments')) {
    return 'payments';
  }
  if (pathname.startsWith('/dashboard/check-in-settings')) {
    return 'check_in_settings';
  }
  return null;
};




