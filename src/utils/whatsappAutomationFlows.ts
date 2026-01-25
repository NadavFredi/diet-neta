/**
 * WhatsApp Automation Flows Utility
 * 
 * Shared logic for determining which automation flows are active
 * This ensures consistency between the automations page and components that use templates
 */

export interface FlowConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

export const DEFAULT_FLOW_CONFIGS: FlowConfig[] = [
  {
    key: 'customer_journey_start',
    label: 'תחילת מסע לקוח ותיאום פגישה',
  },
  {
    key: 'intro_questionnaire',
    label: 'אוטומטי שליחת שאלון הכרות לאחר קביעת שיחה',
  },
  {
    key: 'budget',
    label: 'שליחת תכנית פעולה',
  },
  {
    key: 'payment_request',
    label: 'בקשת תשלום',
  },
  {
    key: 'trainee_user_credentials',
    label: 'שליחת פרטי משתמש חניך',
  },
  {
    key: 'weekly_review',
    label: 'סיכום שבועי ויעדים',
  },
];

// Load custom flows from localStorage
export const loadCustomFlows = (): FlowConfig[] => {
  try {
    const stored = localStorage.getItem('custom_automation_flows');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
  }
  return [];
};

// Save custom flows to localStorage
export const saveCustomFlows = (flows: FlowConfig[]): void => {
  try {
    localStorage.setItem('custom_automation_flows', JSON.stringify(flows));
  } catch (error) {
    // Silent failure
  }
};

// Load deleted default flows from localStorage
export const loadDeletedDefaultFlows = (): string[] => {
  try {
    const stored = localStorage.getItem('deleted_default_automation_flows');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
  }
  return [];
};

// Save deleted default flows to localStorage
export const saveDeletedDefaultFlows = (deletedKeys: string[]): void => {
  try {
    localStorage.setItem('deleted_default_automation_flows', JSON.stringify(deletedKeys));
  } catch (error) {
    // Silent failure
  }
};

/**
 * Get all active flows (same logic as WhatsAppAutomationsPage)
 * This ensures consistency - only flows shown on the automations page are available
 */
export const getActiveFlows = (): FlowConfig[] => {
  const customFlows = loadCustomFlows();
  const deletedDefaultFlows = loadDeletedDefaultFlows();

  // Filter out deleted default flows
  const activeDefaultFlows = DEFAULT_FLOW_CONFIGS.filter(
    flow => !deletedDefaultFlows.includes(flow.key)
  );

  const defaultFlowKeys = new Set(activeDefaultFlows.map(f => f.key));

  // Get custom flows that are NOT overriding default flows
  const pureCustomFlows = customFlows.filter(flow => !defaultFlowKeys.has(flow.key));

  // Get custom flows that override defaults (these will replace the defaults)
  const overridingCustomFlows = customFlows.filter(flow => defaultFlowKeys.has(flow.key));

  // Use custom override if exists, otherwise use default
  const mergedFlows = activeDefaultFlows.map(defaultFlow => {
    const customOverride = overridingCustomFlows.find(cf => cf.key === defaultFlow.key);
    return customOverride || defaultFlow;
  });

  // Combine: merged defaults/customs + pure custom flows
  return [...mergedFlows, ...pureCustomFlows];
};

/**
 * Get flow label for a given flow key
 */
export const getFlowLabel = (flowKey: string, defaultLabel?: string): string => {
  const activeFlows = getActiveFlows();
  const flow = activeFlows.find(f => f.key === flowKey);
  return flow?.label || defaultLabel || flowKey;
};
