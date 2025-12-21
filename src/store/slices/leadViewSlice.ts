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
    { customerId, content }: { customerId: string; content: string },
    { rejectWithValue, getState }
  ) => {
    try {
      // Optimistic update: create temporary note
      const tempId = `temp-${Date.now()}`;
      const optimisticNote: CustomerNote = {
        id: tempId,
        customer_id: customerId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert into database
      const { data, error } = await supabase
        .from('customer_notes')
        .insert([{ customer_id: customerId, content }])
        .select()
        .single();

      if (error) throw error;

      return { customerId, note: data as CustomerNote, tempId };
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
      } else {
        // Clear all
        state.notes = {};
        state.isLoadingNotes = {};
        state.notesError = {};
      }
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
        // Optimistic update
        const tempNote: CustomerNote = {
          id: `temp-${Date.now()}`,
          customer_id: customerId,
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
        const { customerId, note, tempId } = action.payload;
        if (state.notes[customerId]) {
          // Replace temp note with real note
          const index = state.notes[customerId].findIndex(n => n.id === tempId);
          if (index !== -1) {
            state.notes[customerId][index] = note;
          } else {
            // If temp note not found, prepend the real note
            state.notes[customerId] = [note, ...state.notes[customerId]];
          }
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

export default leadViewSlice.reducer;


