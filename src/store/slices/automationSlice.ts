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

export interface MediaData {
  type: 'image' | 'video' | 'gif';
  url: string;
}

export interface WhatsAppFlowTemplate {
  id: string;
  user_id: string;
  flow_key: string;
  template_content: string;
  buttons?: WhatsAppButton[]; // Optional array of interactive buttons (max 3)
  media?: MediaData | null; // Optional media attachment (image, video, or GIF)
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
          
          // Parse media from JSONB if it exists
          let parsedMedia: MediaData | null = null;
          if (template.media !== null && template.media !== undefined) {
            try {
              let mediaData = template.media;
              if (typeof mediaData === 'string') {
                mediaData = JSON.parse(mediaData);
              }
              if (typeof mediaData === 'object' && mediaData !== null && typeof mediaData.type === 'string' && typeof mediaData.url === 'string') {
                parsedMedia = {
                  type: mediaData.type as 'image' | 'video' | 'gif',
                  url: String(mediaData.url)
                };
              }
            } catch (error) {
              console.warn('[fetchTemplates] Error parsing media:', error, template.media);
            }
          }

          const parsedTemplate: WhatsAppFlowTemplate = {
            ...template,
            buttons: parsedButtons,
            media: parsedMedia,
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
      buttons,
      media
    }: { 
      flowKey: string; 
      templateContent: string; 
      buttons?: WhatsAppButton[];
      media?: { type: 'image' | 'video' | 'gif'; file?: File; url?: string; previewUrl?: string } | null;
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

      // Handle media upload (if file needs to be uploaded to storage)
      let mediaData: MediaData | null = null;
      if (media) {
        if (media.file) {
          // Upload file to storage
          const fileExt = media.file.name.split('.').pop();
          const fileName = `${user.id}/${flowKey}/${Date.now()}.${fileExt}`;
          const bucketName = 'client-assets'; // Using existing bucket
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(`templates/${fileName}`, media.file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('[saveTemplate] Error uploading file:', uploadError);
            
            // Provide user-friendly error messages based on error type
            let errorMessage = 'נכשל בהעלאת הקובץ';
            if (uploadError.message.includes('name resolution failed') || uploadError.message.includes('503')) {
              errorMessage = 'שירות האחסון לא זמין כרגע. אנא ודא שהשירות פועל או נסה שוב מאוחר יותר.';
            } else if (uploadError.message.includes('Bucket not found')) {
              errorMessage = 'תיקיית האחסון לא נמצאה. אנא ודא שהשירות מוגדר כהלכה.';
            } else {
              errorMessage = `נכשל בהעלאת הקובץ: ${uploadError.message}`;
            }
            
            throw new Error(errorMessage);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`templates/${fileName}`);

          mediaData = {
            type: media.type,
            url: urlData.publicUrl
          };
        } else if (media.url) {
          // GIF or existing URL - store directly
          mediaData = {
            type: media.type,
            url: media.url
          };
        }
      }

      const updateData: any = { 
        template_content: templateContent,
      };
      
      // Always update buttons - use empty array if undefined or empty to clear buttons
      // Supabase will automatically handle JSONB conversion
      updateData.buttons = (buttons && buttons.length > 0) ? buttons : [];
      
      // Update media (can be null to clear)
      updateData.media = mediaData;

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
            media: mediaData,
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


