/**
 * Automation Slice
 * 
 * Manages WhatsApp flow templates and automation state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

export interface WhatsAppButton {
  id: string;
  text: string;
}

export interface WhatsAppFlowTemplate {
  id: string;
  user_id: string;
  flow_key: string;
  template_content: string;
  buttons?: WhatsAppButton[]; // Optional array of interactive buttons (max 3)
  created_at: string;
  updated_at: string;
}

export interface AutomationState {
  templates: Record<string, WhatsAppFlowTemplate>; // key: flow_key, value: template
  isLoading: boolean;
  error: string | null;
  sendingFlow: Record<string, boolean>; // Track which flow is currently being sent
}

const initialState: AutomationState = {
  templates: {},
  isLoading: false,
  error: null,
  sendingFlow: {},
};

// Fetch all templates for current user
export const fetchTemplates = createAsyncThunk(
  'automation/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('whatsapp_flow_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Convert array to object keyed by flow_key
      const templatesMap: Record<string, WhatsAppFlowTemplate> = {};
      if (data) {
        data.forEach((template) => {
          // Parse buttons from JSONB if they exist
          // Supabase returns JSONB as already parsed, but we need to ensure it's an array
          let parsedButtons: WhatsAppButton[] | undefined = undefined;
          if (template.buttons !== null && template.buttons !== undefined) {
            try {
              let buttonsData = template.buttons;
              
              // If it's a string, parse it first
              if (typeof buttonsData === 'string') {
                buttonsData = JSON.parse(buttonsData);
              }
              
              // If it's an array, validate and normalize
              if (Array.isArray(buttonsData)) {
                parsedButtons = buttonsData
                  .filter((btn: any) => {
                    if (!btn || typeof btn !== 'object') return false;
                    // Accept both {id, text} and {id, name} formats for compatibility
                    const hasId = typeof btn.id === 'string' && btn.id.length > 0;
                    const hasText = typeof btn.text === 'string';
                    const hasName = typeof btn.name === 'string';
                    return hasId && (hasText || hasName);
                  })
                  .map((btn: any) => ({
                    id: String(btn.id),
                    text: String(btn.text || btn.name || '')
                  }));
              } else if (typeof buttonsData === 'object' && buttonsData !== null) {
                // Handle single object case (shouldn't happen, but be defensive)
                if (typeof (buttonsData as any).id === 'string') {
                  parsedButtons = [{
                    id: String((buttonsData as any).id),
                    text: String((buttonsData as any).text || (buttonsData as any).name || '')
                  }];
                }
              }
              
              // Only set if we have valid buttons
              if (!parsedButtons || parsedButtons.length === 0) {
                parsedButtons = undefined;
              }
            } catch (error) {
              console.warn('[fetchTemplates] Error parsing buttons:', error, template.buttons);
              parsedButtons = undefined;
            }
          }
          
          const parsedTemplate: WhatsAppFlowTemplate = {
            ...template,
            buttons: parsedButtons,
          } as WhatsAppFlowTemplate;
          templatesMap[template.flow_key] = parsedTemplate;
        });
      }

      return templatesMap;
    } catch (error: any) {
      console.error('[fetchTemplates] Error:', error);
      return rejectWithValue(error?.message || 'Failed to fetch templates');
    }
  }
);

// Save or update template
export const saveTemplate = createAsyncThunk(
  'automation/saveTemplate',
  async (
    { 
      flowKey, 
      templateContent, 
      buttons 
    }: { 
      flowKey: string; 
      templateContent: string; 
      buttons?: WhatsAppButton[] 
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate buttons (max 3)
      if (buttons && buttons.length > 3) {
        throw new Error('Maximum 3 buttons allowed per template');
      }

      // Check if template exists
      const state = getState() as { automation: AutomationState };
      const existingTemplate = state.automation.templates[flowKey];

      const updateData: any = { 
        template_content: templateContent,
      };
      
      // Always update buttons - use empty array if undefined or empty to clear buttons
      // Supabase will automatically handle JSONB conversion
      updateData.buttons = (buttons && buttons.length > 0) ? buttons : [];

      if (existingTemplate) {
        // Update existing template
        const { data, error } = await supabase
          .from('whatsapp_flow_templates')
          .update(updateData)
          .eq('id', existingTemplate.id)
          .select()
          .single();

        if (error) throw error;
        return data as WhatsAppFlowTemplate;
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('whatsapp_flow_templates')
          .insert({
            user_id: user.id,
            flow_key: flowKey,
            template_content: templateContent,
            buttons: buttons || [],
          })
          .select()
          .single();

        if (error) throw error;
        return data as WhatsAppFlowTemplate;
      }
    } catch (error: any) {
      console.error('[saveTemplate] Error:', error);
      return rejectWithValue(error?.message || 'Failed to save template');
    }
  }
);

// Send flow message (this will be called from the component using Green API service)
export const sendFlowMessage = createAsyncThunk(
  'automation/sendFlowMessage',
  async (
    { flowKey }: { flowKey: string },
    { rejectWithValue }
  ) => {
    // This is just for state tracking - actual API call will be in the component
    // to have access to lead/customer data for placeholder replacement
    return flowKey;
  }
);

const automationSlice = createSlice({
  name: 'automation',
  initialState,
  reducers: {
    setSendingFlow: (state, action: PayloadAction<{ flowKey: string; isSending: boolean }>) => {
      state.sendingFlow[action.payload.flowKey] = action.payload.isSending;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch templates
      .addCase(fetchTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Save template
      .addCase(saveTemplate.pending, (state) => {
        state.error = null;
      })
      .addCase(saveTemplate.fulfilled, (state, action) => {
        state.templates[action.payload.flow_key] = action.payload;
      })
      .addCase(saveTemplate.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Send flow message
      .addCase(sendFlowMessage.pending, (state, action) => {
        state.sendingFlow[action.meta.arg.flowKey] = true;
      })
      .addCase(sendFlowMessage.fulfilled, (state, action) => {
        state.sendingFlow[action.payload] = false;
      })
      .addCase(sendFlowMessage.rejected, (state, action) => {
        if (action.meta.arg.flowKey) {
          state.sendingFlow[action.meta.arg.flowKey] = false;
        }
        state.error = action.payload as string;
      });
  },
});

export const { setSendingFlow, clearError } = automationSlice.actions;
export default automationSlice.reducer;


