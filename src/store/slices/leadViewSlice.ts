/**
 * leadViewSlice - Redux slice for Lead Details View
 * 
 * Manages:
 * - Sidebar state (history, notes, or none)
 * - Customer notes (customer-centric, unified across leads)
 */

import { createSlice, PayloadAction, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

// ============================================
// Types
// ============================================

export type SidebarType = 'none' | 'history' | 'notes' | 'submission';
export type LeftSidebarType = 'none' | 'history' | 'submission';

export interface CustomerNote {
  id: string;
  customer_id: string;
  lead_id: string | null; // Optional reference to a specific lead/inquiry
  content: string;
  attachment_url: string | null; // URL/path to file attachment in Supabase Storage
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface LeadViewState {
  // Sidebar state - split into left sidebar and notes (independent)
  leftSidebar: LeftSidebarType; // Left sidebar: history or submission
  notesOpen: boolean; // Right sidebar: notes (independent from left sidebar)
  selectedFormType: 'details' | 'intro' | 'characterization' | null; // Track which form is open in submission sidebar
  // Legacy: keep activeSidebar for backward compatibility, computed from leftSidebar and notesOpen
  
  // Notes state (customer-centric)
  notes: {
    [customerId: string]: CustomerNote[];
  };
  isLoadingNotes: {
    [customerId: string]: boolean;
  };
  notesError: {
    [customerId: string]: string | null;
  };
  currentNoteFilter: {
    [customerId: string]: string | null;
  };
}

// ============================================
// Initial State
// ============================================

const initialState: LeadViewState = {
  leftSidebar: 'none',
  notesOpen: false,
  selectedFormType: null,
  notes: {},
  isLoadingNotes: {},
  notesError: {},
  currentNoteFilter: {},
};

// ============================================
// Async Thunks - Notes Operations
// ============================================

/**
 * Fetch notes for a customer
 */
export const fetchCustomerNotes = createAsyncThunk(
  'leadView/fetchCustomerNotes',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { customerId, notes: data || [] };
    } catch (error) {
      return rejectWithValue({ 
        customerId, 
        error: error instanceof Error ? error.message : 'Failed to fetch notes' 
      });
    }
  }
);

/**
 * Add a new note for a customer
 */
export const addCustomerNote = createAsyncThunk(
  'leadView/addCustomerNote',
  async (
    { customerId, content, leadId, attachmentUrl, tempId }: { customerId: string; content: string; leadId?: string | null; attachmentUrl?: string | null; tempId?: string },
    { rejectWithValue, getState }
  ) => {
    try {
      // Insert into database with optional lead_id and attachment_url
      // Always include lead_id in the insert (can be null)
      const insertData: any = {
        customer_id: customerId,
        content,
      };
      
      // Include lead_id only if it's not null/undefined (Supabase will handle null)
      if (leadId !== null && leadId !== undefined) {
        insertData.lead_id = leadId;
      } else {
        // Explicitly set to null if not provided
        insertData.lead_id = null;
      }

      // Include attachment_url if provided
      if (attachmentUrl) {
        insertData.attachment_url = attachmentUrl;
      }
      
      const { data, error } = await supabase
        .from('customer_notes')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return { customerId, note: data as CustomerNote, tempId: tempId || `temp-${Date.now()}` };
    } catch (error) {
      return rejectWithValue({ 
        customerId, 
        error: error instanceof Error ? error.message : 'Failed to add note' 
      });
    }
  }
);

/**
 * Update an existing note
 */
export const updateCustomerNote = createAsyncThunk(
  'leadView/updateCustomerNote',
  async (
    { noteId, content, attachmentUrl }: { noteId: string; content: string; attachmentUrl?: string | null },
    { rejectWithValue, getState }
  ) => {
    try {
      // Find which customer this note belongs to
      const state = getState() as { leadView: LeadViewState };
      let customerId: string | null = null;
      
      for (const [cid, notes] of Object.entries(state.leadView.notes)) {
        if (notes.some(n => n.id === noteId)) {
          customerId = cid;
          break;
        }
      }

      if (!customerId) {
        throw new Error('Customer ID not found for note');
      }

      const updateData: any = { content };
      if (attachmentUrl !== undefined) {
        updateData.attachment_url = attachmentUrl;
      }

      const { data, error } = await supabase
        .from('customer_notes')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      return { customerId, note: data as CustomerNote };
    } catch (error) {
      return rejectWithValue({ 
        error: error instanceof Error ? error.message : 'Failed to update note' 
      });
    }
  }
);

/**
 * Delete a note
 */
export const deleteCustomerNote = createAsyncThunk(
  'leadView/deleteCustomerNote',
  async (noteId: string, { rejectWithValue, getState }) => {
    try {
      // Find which customer this note belongs to
      const state = getState() as { leadView: LeadViewState };
      let customerId: string | null = null;
      
      for (const [cid, notes] of Object.entries(state.leadView.notes)) {
        if (notes.some(n => n.id === noteId)) {
          customerId = cid;
          break;
        }
      }

      if (!customerId) {
        throw new Error('Customer ID not found for note');
      }

      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      return { customerId, noteId };
    } catch (error) {
      return rejectWithValue({ 
        error: error instanceof Error ? error.message : 'Failed to delete note' 
      });
    }
  }
);

// ============================================
// Slice
// ============================================

const leadViewSlice = createSlice({
  name: 'leadView',
  initialState,
  reducers: {
    // Left sidebar state management (history or submission)
    setLeftSidebar: (state, action: PayloadAction<LeftSidebarType>) => {
      state.leftSidebar = action.payload;
      // Clear selected form type if closing submission sidebar or opening different sidebar
      if (action.payload !== 'submission') {
        state.selectedFormType = null;
      }
    },
    toggleLeftSidebar: (state, action: PayloadAction<LeftSidebarType>) => {
      // If clicking the same sidebar type, close it; otherwise switch to it
      if (state.leftSidebar === action.payload) {
        state.leftSidebar = 'none';
        if (action.payload === 'submission') {
          state.selectedFormType = null;
        }
      } else {
        state.leftSidebar = action.payload;
        // Clear selected form type when switching to history
        if (action.payload === 'history') {
          state.selectedFormType = null;
        }
      }
    },
    setSelectedFormType: (state, action: PayloadAction<'details' | 'intro' | 'characterization'>) => {
      state.selectedFormType = action.payload;
      state.leftSidebar = 'submission'; // Automatically open submission sidebar (replaces history)
    },
    // Notes sidebar state management (independent from left sidebar)
    setNotesOpen: (state, action: PayloadAction<boolean>) => {
      state.notesOpen = action.payload;
    },
    toggleNotes: (state) => {
      state.notesOpen = !state.notesOpen;
    },
    // Legacy: backward compatibility helpers
    setActiveSidebar: (state, action: PayloadAction<SidebarType>) => {
      // Map legacy calls to new state structure
      if (action.payload === 'notes') {
        state.notesOpen = true;
      } else if (action.payload === 'none') {
        state.leftSidebar = 'none';
        state.notesOpen = false;
      } else {
        state.leftSidebar = action.payload as LeftSidebarType;
        if (action.payload !== 'submission') {
          state.selectedFormType = null;
        }
      }
    },
    toggleSidebar: (state, action: PayloadAction<SidebarType>) => {
      // Map legacy calls to new state structure
      if (action.payload === 'notes') {
        state.notesOpen = !state.notesOpen;
      } else {
        if (state.leftSidebar === action.payload) {
          state.leftSidebar = 'none';
          if (action.payload === 'submission') {
            state.selectedFormType = null;
          }
        } else {
          state.leftSidebar = action.payload as LeftSidebarType;
          if (action.payload === 'history') {
            state.selectedFormType = null;
          }
        }
      }
    },
    closeSidebar: (state) => {
      state.leftSidebar = 'none';
      state.notesOpen = false;
      state.selectedFormType = null;
    },

    // Clear notes cache when navigating away
    clearNotesCache: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        // Clear specific customer
        delete state.notes[action.payload];
        delete state.isLoadingNotes[action.payload];
        delete state.notesError[action.payload];
        delete state.currentNoteFilter[action.payload];
      } else {
        // Clear all
        state.notes = {};
        state.isLoadingNotes = {};
        state.notesError = {};
        state.currentNoteFilter = {};
      }
    },
    
    // Set note filter for a customer
    setNoteFilter: (state, action: PayloadAction<{ customerId: string; leadId: string | null }>) => {
      state.currentNoteFilter[action.payload.customerId] = action.payload.leadId;
    },
  },
  extraReducers: (builder) => {
    // Fetch notes
    builder
      .addCase(fetchCustomerNotes.pending, (state, action) => {
        const customerId = action.meta.arg;
        state.isLoadingNotes[customerId] = true;
        state.notesError[customerId] = null;
      })
      .addCase(fetchCustomerNotes.fulfilled, (state, action) => {
        const { customerId, notes } = action.payload;
        state.notes[customerId] = notes;
        state.isLoadingNotes[customerId] = false;
        state.notesError[customerId] = null;
      })
      .addCase(fetchCustomerNotes.rejected, (state, action) => {
        const payload = action.payload as { customerId: string; error: string };
        if (payload) {
          state.isLoadingNotes[payload.customerId] = false;
          state.notesError[payload.customerId] = payload.error;
        }
      });

    // Add note (optimistic update)
    builder
      .addCase(addCustomerNote.pending, (state, action) => {
        const { customerId } = action.meta.arg;
        // Generate tempId and store it in meta for use in fulfilled
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Store tempId in action.meta for later use
        (action.meta as any).tempId = tempId;
        
        // Optimistic update
        // leadId should always be set (either from filter or most recent lead)
        const leadId = action.meta.arg.leadId || null;
        const tempNote: CustomerNote = {
          id: tempId,
          customer_id: customerId,
          lead_id: leadId,
          content: action.meta.arg.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (!state.notes[customerId]) {
          state.notes[customerId] = [];
        }
        state.notes[customerId] = [tempNote, ...state.notes[customerId]];
      })
      .addCase(addCustomerNote.fulfilled, (state, action) => {
        const { customerId, note } = action.payload;
        const tempId = (action.meta as any).tempId || action.payload.tempId;
        
        if (state.notes[customerId]) {
          // Remove all temp notes for this customer and replace with real note
          state.notes[customerId] = state.notes[customerId].filter(
            n => !n.id.startsWith('temp-')
          );
          // Prepend the real note
          state.notes[customerId] = [note, ...state.notes[customerId]];
          // Sort by created_at descending
          state.notes[customerId].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      })
      .addCase(addCustomerNote.rejected, (state, action) => {
        const { customerId } = action.meta.arg;
        // Remove optimistic note on error
        if (state.notes[customerId]) {
          state.notes[customerId] = state.notes[customerId].filter(
            n => !n.id.startsWith('temp-')
          );
        }
        const payload = action.payload as { customerId: string; error: string };
        if (payload) {
          state.notesError[customerId] = payload.error;
        }
      });

    // Update note
    builder
      .addCase(updateCustomerNote.fulfilled, (state, action) => {
        const { customerId, note } = action.payload;
        if (state.notes[customerId]) {
          const index = state.notes[customerId].findIndex(n => n.id === note.id);
          if (index !== -1) {
            state.notes[customerId][index] = note;
          }
        }
      });

    // Delete note
    builder
      .addCase(deleteCustomerNote.fulfilled, (state, action) => {
        const { customerId, noteId } = action.payload;
        if (state.notes[customerId]) {
          state.notes[customerId] = state.notes[customerId].filter(
            n => n.id !== noteId
          );
        }
      });
  },
});

// ============================================
// Actions & Selectors
// ============================================

export const {
  setLeftSidebar,
  toggleLeftSidebar,
  setSelectedFormType,
  setNotesOpen,
  toggleNotes,
  setActiveSidebar, // Legacy - for backward compatibility
  toggleSidebar, // Legacy - for backward compatibility
  closeSidebar,
  clearNotesCache,
  setNoteFilter,
} = leadViewSlice.actions;

// Selectors
// New selectors for independent sidebar states
export const selectLeftSidebar = (state: { leadView: LeadViewState }) => 
  state.leadView.leftSidebar;

export const selectNotesOpen = (state: { leadView: LeadViewState }) => 
  state.leadView.notesOpen;

// Legacy selector for backward compatibility (returns the "main" sidebar state)
export const selectActiveSidebar = (state: { leadView: LeadViewState }): SidebarType => {
  // If notes are open, prioritize notes for legacy compatibility
  // Otherwise return left sidebar
  if (state.leadView.notesOpen) {
    return 'notes';
  }
  return state.leadView.leftSidebar;
};

// Stable default values to prevent unnecessary re-renders
const DEFAULT_NOTES: CustomerNote[] = [];

// Memoized selector factory for customer notes
// This creates a memoized selector that returns stable references
export const selectCustomerNotes = (customerId: string | null | undefined) => {
  return createSelector(
    [
      (state: { leadView: LeadViewState }) => state.leadView.notes,
      (_state: { leadView: LeadViewState }) => customerId,
    ],
    (notes, id): CustomerNote[] => {
      if (!id) return DEFAULT_NOTES;
      const customerNotes = notes[id];
      // Return the actual array if it exists, otherwise return stable default
      return customerNotes ?? DEFAULT_NOTES;
    }
  );
};

export const selectIsLoadingNotes = (customerId: string | null | undefined) => 
  (state: { leadView: LeadViewState }): boolean => {
    if (!customerId) return false;
    return state.leadView.isLoadingNotes[customerId] || false;
  };

export const selectNotesError = (customerId: string | null | undefined) => 
  (state: { leadView: LeadViewState }): string | null => {
    if (!customerId) return null;
    return state.leadView.notesError[customerId] || null;
  };

export const selectNoteFilter = (customerId: string | null | undefined) => 
  (state: { leadView: LeadViewState }): string | null => {
    if (!customerId) return null;
    return state.leadView.currentNoteFilter[customerId] || null;
  };

export default leadViewSlice.reducer;


