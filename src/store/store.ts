import { configureStore, Middleware } from '@reduxjs/toolkit';
import { api } from './api/apiSlice';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import tableStateReducer from './slices/tableStateSlice';
import leadViewReducer from './slices/leadViewSlice';
import sidebarReducer from './slices/sidebarSlice';
import interfaceIconPreferencesReducer from './slices/interfaceIconPreferencesSlice';
import clientReducer from './slices/clientSlice';
import invitationReducer from './slices/invitationSlice';
import impersonationReducer from './slices/impersonationSlice';
import automationReducer from './slices/automationSlice';
import formsReducer from './slices/formsSlice';
import paymentReducer from './slices/paymentSlice';
import budgetReducer from './slices/budgetSlice';
import subscriptionTypesReducer from './slices/subscriptionTypesSlice';
import notificationReducer from './slices/notificationSlice';
import calendarReducer from './slices/calendarSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    tableState: tableStateReducer,
    leadView: leadViewReducer,
    sidebar: sidebarReducer,
    interfaceIconPreferences: interfaceIconPreferencesReducer,
    client: clientReducer,
    invitation: invitationReducer,
    impersonation: impersonationReducer,
    automation: automationReducer,
    forms: formsReducer,
    payment: paymentReducer,
    budget: budgetReducer,
    subscriptionTypes: subscriptionTypesReducer,
    notifications: notificationReducer,
    calendar: calendarReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => {
    // Middleware to persist auth state to localStorage
    const authPersistMiddleware: Middleware = (store) => (next) => (action) => {
      const result = next(action);
      
      // Save auth state to localStorage after any auth-related action
      if (action.type?.startsWith('auth/')) {
        const state = store.getState();
        try {
          if (state.auth.isAuthenticated && state.auth.user) {
            localStorage.setItem('auth', JSON.stringify(state.auth));
          } else {
            localStorage.removeItem('auth');
          }
        } catch (error) {
          // Silent failure
        }
      }
      
      return result;
    };

    return getDefaultMiddleware().concat(api.middleware, authPersistMiddleware);
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;









