/**
 * Forms Slice
 * 
 * Manages Fillout form submissions state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getFormSubmissions, 
  findMostRecentSubmission,
  type FilloutSubmission 
} from '@/services/filloutService';

// Form IDs from environment variables
const FORM_IDS = {
  DETAILS: import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS || '',
  INTRO: import.meta.env.VITE_FILLOUT_FORM_ID_INTRO || '',
  CHARACTERIZATION: import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION || '',
};

export interface FormType {
  key: 'details' | 'intro' | 'characterization';
  label: string;
  formId: string;
}

export const FORM_TYPES: FormType[] = [
  { key: 'details', label: 'טופס פרטים', formId: FORM_IDS.DETAILS },
  { key: 'intro', label: 'שאלון היכרות', formId: FORM_IDS.INTRO },
  { key: 'characterization', label: 'שאלון איפיון', formId: FORM_IDS.CHARACTERIZATION },
];

export interface FormsState {
  submissions: Record<string, FilloutSubmission | null>; // key: formType_key, value: submission
  isLoading: Record<string, boolean>; // key: formType_key
  error: string | null;
}

const initialState: FormsState = {
  submissions: {},
  isLoading: {},
  error: null,
};

interface FetchFormSubmissionParams {
  formType: 'details' | 'intro' | 'characterization';
  email: string; // Lead email to match submissions
}

/**
 * Fetch the most recent form submission for a specific form type and lead email
 */
export const fetchFormSubmission = createAsyncThunk(
  'forms/fetchFormSubmission',
  async (
    { formType, email }: FetchFormSubmissionParams,
    { rejectWithValue }
  ) => {
    try {
      if (!email) {
        throw new Error('Email is required to fetch form submissions');
      }

      const formTypeConfig = FORM_TYPES.find((f) => f.key === formType);
      if (!formTypeConfig || !formTypeConfig.formId) {
        throw new Error(`Form ID not configured for ${formType}`);
      }

      const submission = await findMostRecentSubmission(
        formTypeConfig.formId,
        email
      );

      return {
        formType,
        submission,
      };
    } catch (error: any) {
      console.error('[fetchFormSubmission] Error:', error);
      return rejectWithValue(error?.message || 'Failed to fetch form submission');
    }
  }
);

/**
 * Fetch all form submissions for a lead (all three forms)
 */
export const fetchAllFormSubmissions = createAsyncThunk(
  'forms/fetchAllFormSubmissions',
  async (
    { email }: { email: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      if (!email) {
        throw new Error('Email is required to fetch form submissions');
      }

      // Fetch all three forms in parallel
      const promises = FORM_TYPES.map((formType) =>
        dispatch(
          fetchFormSubmission({
            formType: formType.key as 'details' | 'intro' | 'characterization',
            email,
          })
        ).unwrap()
      );

      await Promise.all(promises);

      return { success: true };
    } catch (error: any) {
      console.error('[fetchAllFormSubmissions] Error:', error);
      return rejectWithValue(error?.message || 'Failed to fetch form submissions');
    }
  }
);

const formsSlice = createSlice({
  name: 'forms',
  initialState,
  reducers: {
    clearSubmission: (state, action: PayloadAction<string>) => {
      // Clear submission for a specific form type
      const key = action.payload;
      delete state.submissions[key];
      delete state.isLoading[key];
    },
    clearAllSubmissions: (state) => {
      state.submissions = {};
      state.isLoading = {};
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch form submission
      .addCase(fetchFormSubmission.pending, (state, action) => {
        const key = action.meta.arg.formType;
        state.isLoading[key] = true;
        state.error = null;
      })
      .addCase(fetchFormSubmission.fulfilled, (state, action) => {
        const { formType, submission } = action.payload;
        const key = formType;
        state.isLoading[key] = false;
        state.submissions[key] = submission;
      })
      .addCase(fetchFormSubmission.rejected, (state, action) => {
        const key = action.meta.arg.formType;
        state.isLoading[key] = false;
        state.error = action.payload as string;
      })
      // Fetch all form submissions
      .addCase(fetchAllFormSubmissions.pending, (state) => {
        // Set loading for all forms
        FORM_TYPES.forEach((formType) => {
          state.isLoading[formType.key] = true;
        });
        state.error = null;
      })
      .addCase(fetchAllFormSubmissions.fulfilled, (state) => {
        // Loading states are managed by individual fetchFormSubmission actions
      })
      .addCase(fetchAllFormSubmissions.rejected, (state, action) => {
        FORM_TYPES.forEach((formType) => {
          state.isLoading[formType.key] = false;
        });
        state.error = action.payload as string;
      });
  },
});

export const { clearSubmission, clearAllSubmissions, clearError } = formsSlice.actions;
export default formsSlice.reducer;
