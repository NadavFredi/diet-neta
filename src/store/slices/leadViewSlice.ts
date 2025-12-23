/**
 * leadViewSlice - Redux slice for Lead Details View
 * 
 * Manages:
 * - Sidebar state (history, notes, or none)
 * - Customer notes (customer-centric, unified across leads)
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

// ============================================
// Types
// ============================================

export type SidebarType = 'none' | 'history' | 'notes';

export interface CustomerNote {
  id: string;
  customer_id: string;
  lead_id: string | null; // Optional reference to a specific lead/inquiry
  content: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface LeadViewState {
  // Sidebar state
  activeSidebar: SidebarType;
  
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
}

// ============================================
// Initial State
// ============================================

const initialState: LeadViewState = {
  activeSidebar: 'none',
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
    { customerId, content, leadId, tempId }: { customerId: string; content: string; leadId?: string | null; tempId?: string },
    { rejectWithValue, getState }
  ) => {
    try {
      // Insert into database with optional lead_id
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
      
      console.log('Inserting note with data:', insertData);
      
      const { data, error } = await supabase
        .from('customer_notes')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error adding note:', error);
        console.error('Insert data:', insertData);
        throw error;
      }
      
      console.log('Note added successfully:', data);

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
    { noteId, content }: { noteId: string; content: string },
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

      const { data, error } = await supabase
        .from('customer_notes')
        .update({ content, updated_at: new Date().toISOString() })
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
    // Sidebar state management
    setActiveSidebar: (state, action: PayloadAction<SidebarType>) => {
      state.activeSidebar = action.payload;
    },
    toggleSidebar: (state, action: PayloadAction<SidebarType>) => {
      // If clicking the same sidebar type, close it; otherwise switch to it
      if (state.activeSidebar === action.payload) {
        state.activeSidebar = 'none';
      } else {
        state.activeSidebar = action.payload;
      }
    },
    closeSidebar: (state) => {
      state.activeSidebar = 'none';
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
  setActiveSidebar,
  toggleSidebar,
  closeSidebar,
  clearNotesCache,
  setNoteFilter,
} = leadViewSlice.actions;

// Selectors
export const selectActiveSidebar = (state: { leadView: LeadViewState }) => 
  state.leadView.activeSidebar;

export const selectCustomerNotes = (customerId: string | null | undefined) => 
  (state: { leadView: LeadViewState }): CustomerNote[] => {
    if (!customerId) return [];
    return state.leadView.notes[customerId] || [];
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


