
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
import CustomersManagement from "./pages/CustomersManagement.tsx";
import UnifiedProfileView from "./pages/UnifiedProfileView.tsx";
import NotFound from "./pages/NotFound.tsx";
import ClientDashboard from "./pages/client/ClientDashboard.tsx";
import { InviteAccept } from "./pages/InviteAccept.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthRedirect from "./components/AuthRedirect";
import { AppFooter } from "./components/layout/AppFooter";
import { DevModeProvider } from "./hooks/useDevMode";
import { AuthInitializer } from "./components/AuthInitializer";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname.startsWith('/leads');
  const isClientDashboard = location.pathname === '/client/dashboard';
  
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
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
            path="/dashboard/customers"
            element={
              <ProtectedRoute>
                <CustomersManagement />
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
      {!isLoginPage && <AppFooter className={isClientDashboard ? "" : "mt-10"} />}
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
