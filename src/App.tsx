
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import TemplatesManagement from "./pages/TemplatesManagement.tsx";
import NutritionTemplatesManagement from "./pages/NutritionTemplatesManagement.tsx";
import BudgetManagement from "./pages/BudgetManagement.tsx";
import SubscriptionTypesManagement from "./pages/SubscriptionTypesManagement.tsx";
import KnowledgeBaseManagement from "./pages/KnowledgeBaseManagement.tsx";
import CustomersManagement from "./pages/CustomersManagement.tsx";
import MeetingsManagement from "./pages/MeetingsManagement.tsx";
import MeetingDetailView from "./pages/MeetingDetailView.tsx";
import UnifiedProfileView from "./pages/UnifiedProfileView.tsx";
import { CheckInSettingsPage } from "./pages/CheckInSettingsPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import ClientDashboard from "./pages/client/ClientDashboard.tsx";
import { InviteAccept } from "./pages/InviteAccept.tsx";
import PrintBudgetPage from "./pages/PrintBudgetPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthRedirect from "./components/AuthRedirect";
import { AppFooter } from "./components/layout/AppFooter";
import { DevModeProvider } from "./hooks/useDevMode";
import { AuthInitializer } from "./components/AuthInitializer";
import { useAppSelector } from "./store/hooks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache (renamed from cacheTime in v5)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false, // Don't refetch on component mount if data exists in cache
      refetchOnReconnect: false, // Don't refetch on reconnect (data is still fresh)
      retry: 1, // Only retry once on failure
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname.startsWith('/leads');
  const isClientDashboard = location.pathname === '/client/dashboard';
  
  // Check if we're on a route that uses the right panel (notes panel)
  const isRightPanelRoute =
    location.pathname.startsWith('/leads/') ||
    location.pathname.startsWith('/dashboard/customers/') ||
    location.pathname.startsWith('/profile/') ||
    location.pathname.startsWith('/dashboard/meetings/');

  // Hide footer when the dashboard sidebar panel is visible
  const isDashboardSidebarRoute =
    (location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/dashboard/print/')) ||
    location.pathname.startsWith('/leads/') ||
    location.pathname.startsWith('/profile/') ||
    location.pathname.startsWith('/client/dashboard');
  
  // Get notesOpen state from Redux
  const notesOpen = useAppSelector((state) => state.leadView.notesOpen);
  
  // Hide footer when dashboard sidebar is visible, or when notes panel is open on right panel routes
  const shouldShowFooter =
    !isLoginPage && !isDashboardSidebarRoute && (!isRightPanelRoute || !notesOpen);
  
  return (
    <div className={isClientDashboard ? "h-screen flex flex-col overflow-hidden" : "min-h-screen flex flex-col"}>
      <main className={isClientDashboard ? "flex-1 overflow-hidden" : "flex-1"}>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/old" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/templates"
            element={
              <ProtectedRoute>
                <TemplatesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/nutrition-templates"
            element={
              <ProtectedRoute>
                <NutritionTemplatesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/budgets"
            element={
              <ProtectedRoute>
                <BudgetManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subscription-types"
            element={
              <ProtectedRoute>
                <SubscriptionTypesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/knowledge-base"
            element={
              <ProtectedRoute>
                <KnowledgeBaseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/print/budget/:id"
            element={
              <ProtectedRoute>
                <PrintBudgetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/check-in-settings"
            element={
              <ProtectedRoute>
                <CheckInSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/customers"
            element={
              <ProtectedRoute>
                <CustomersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/meetings"
            element={
              <ProtectedRoute>
                <MeetingsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/meetings/:id"
            element={
              <ProtectedRoute>
                <MeetingDetailView />
              </ProtectedRoute>
            }
          />
          {/* Unified Profile View - handles both leads and customers */}
          <Route
            path="/leads/:id"
            element={
              <ProtectedRoute>
                <UnifiedProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/customers/:id"
            element={
              <ProtectedRoute>
                <UnifiedProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/lead/:leadId"
            element={
              <ProtectedRoute>
                <UnifiedProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:customerId/:leadId"
            element={
              <ProtectedRoute>
                <UnifiedProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:customerId"
            element={
              <ProtectedRoute>
                <UnifiedProfileView />
              </ProtectedRoute>
            }
          />
          {/* Client/Trainee Routes */}
          <Route
            path="/client/dashboard"
            element={<ClientDashboard />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {shouldShowFooter && (
        <AppFooter 
          className={isClientDashboard ? "mt-0 flex-shrink-0" : undefined} 
        />
      )}
      {/* Login page handles its own footer via AppFooter component */}
      {/* Footer is hidden when right panel (notes panel) is visible on PageLayout routes */}
    </div>
  );
};

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DevModeProvider>
          <BrowserRouter>
            <AuthInitializer>
              <AppContent />
            </AuthInitializer>
          </BrowserRouter>
        </DevModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
