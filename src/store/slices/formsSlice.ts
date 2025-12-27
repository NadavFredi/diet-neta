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

// Helper function to get form IDs from environment variables at runtime
const getFormIds = () => {
  return {
    DETAILS: import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS || '',
    INTRO: import.meta.env.VITE_FILLOUT_FORM_ID_INTRO || '',
    CHARACTERIZATION: import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION || '',
  };
};

export interface FormType {
  key: 'details' | 'intro' | 'characterization';
  label: string;
  formId: string;
}

// Get form types - reads environment variables at runtime
export const getFormTypes = (): FormType[] => {
  const formIds = getFormIds();
  return [
    { key: 'details', label: 'טופס פרטים', formId: formIds.DETAILS },
    { key: 'intro', label: 'שאלון היכרות', formId: formIds.INTRO },
    { key: 'characterization', label: 'שאלון איפיון', formId: formIds.CHARACTERIZATION },
  ];
};

// Export for backwards compatibility
export const FORM_TYPES = getFormTypes();

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
  email?: string; // Lead email to match submissions (fallback)
  phoneNumber?: string; // Lead phone number to match submissions (fallback)
  leadId?: string; // Supabase lead row ID (priority matching - most reliable)
}

/**
 * Fetch the most recent form submission for a specific form type and lead email
 */
export const fetchFormSubmission = createAsyncThunk(
  'forms/fetchFormSubmission',
  async (
    { formType, email, phoneNumber, leadId }: FetchFormSubmissionParams,
    { rejectWithValue }
  ) => {
    try {
      if (!leadId && !email && !phoneNumber) {
        throw new Error('Lead ID, email, or phone number is required to fetch form submissions');
      }

      const formTypes = getFormTypes();
      const formTypeConfig = formTypes.find((f) => f.key === formType);
      
      const envValues = {
        VITE_FILLOUT_FORM_ID_DETAILS: import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS,
        VITE_FILLOUT_FORM_ID_INTRO: import.meta.env.VITE_FILLOUT_FORM_ID_INTRO,
        VITE_FILLOUT_FORM_ID_CHARACTERIZATION: import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION,
      };
      
      // Skip if form ID is not configured or is still a placeholder
      if (!formTypeConfig || !formTypeConfig.formId || 
          formTypeConfig.formId === 'your_characterization_form_id' ||
          formTypeConfig.formId.trim() === '') {
        console.warn('[formsSlice] Form ID not configured or is placeholder:', {
          formType,
          formId: formTypeConfig?.formId,
          envValues,
        });
        const envVarName = formType === 'details' ? 'VITE_FILLOUT_FORM_ID_DETAILS' :
                          formType === 'intro' ? 'VITE_FILLOUT_FORM_ID_INTRO' :
                          'VITE_FILLOUT_FORM_ID_CHARACTERIZATION';
        throw new Error(
          `Form ID not configured for ${formType}. ` +
          `Please set ${envVarName} in .env.local. ` +
          `Current value: "${envValues[envVarName as keyof typeof envValues] || 'undefined'}". ` +
          `After updating .env.local, restart the dev server.`
        );
      }

      console.log('[formsSlice] Fetching submission:', {
        formType,
        formId: formTypeConfig.formId,
        leadId,
        email,
        phoneNumber,
        envVars: {
          DETAILS: import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS,
          INTRO: import.meta.env.VITE_FILLOUT_FORM_ID_INTRO,
          CHARACTERIZATION: import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION,
        },
      });

      const submission = await findMostRecentSubmission(
        formTypeConfig.formId,
        email,
        phoneNumber,
        leadId
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
    { email, phoneNumber }: { email?: string; phoneNumber?: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      if (!email && !phoneNumber && !leadId) {
        throw new Error('Lead ID, email, or phone number is required to fetch form submissions');
      }

      // Fetch all three forms in parallel
      const formTypes = getFormTypes();
      const promises = formTypes.map((formType) =>
        dispatch(
          fetchFormSubmission({
            formType: formType.key as 'details' | 'intro' | 'characterization',
            email,
            phoneNumber,
            leadId,
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
        state.error = null; // Clear previous errors
      })
      .addCase(fetchFormSubmission.fulfilled, (state, action) => {
        const { formType, submission } = action.payload;
        const key = formType;
        state.isLoading[key] = false;
        state.submissions[key] = submission;
        state.error = null; // Clear errors on success
        console.log('[formsSlice] Submission fetched:', {
          formType: key,
          hasSubmission: !!submission,
          submissionId: submission?.submissionId,
        });
      })
      .addCase(fetchFormSubmission.rejected, (state, action) => {
        const key = action.meta.arg.formType;
        state.isLoading[key] = false;
        const errorMsg = action.payload as string || action.error.message || 'Unknown error';
        state.error = errorMsg;
        console.error('[formsSlice] Error fetching submission:', {
          formType: key,
          error: errorMsg,
          payload: action.payload,
        });
      })
      // Fetch all form submissions
      .addCase(fetchAllFormSubmissions.pending, (state) => {
        // Set loading for all forms
        const formTypes = getFormTypes();
        formTypes.forEach((formType) => {
          state.isLoading[formType.key] = true;
        });
        state.error = null;
      })
      .addCase(fetchAllFormSubmissions.fulfilled, (state) => {
        // Loading states are managed by individual fetchFormSubmission actions
      })
      .addCase(fetchAllFormSubmissions.rejected, (state, action) => {
        const formTypes = getFormTypes();
        formTypes.forEach((formType) => {
          state.isLoading[formType.key] = false;
        });
        state.error = action.payload as string;
      });
  },
});

export const { clearSubmission, clearAllSubmissions, clearError } = formsSlice.actions;
export default formsSlice.reducer;


