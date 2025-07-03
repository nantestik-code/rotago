
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import SignUp from "./pages/auth/SignUp";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AuthCallback from "./pages/auth/AuthCallback";
import { AuthProvider } from "@/hooks/use-auth";
import { RouteHistoryProvider } from "@/hooks/use-route-history-provider";
import PrivateRoute from "./components/PrivateRoute";
import AdminPanel from "./pages/admin/AdminPanel";
import RouteHistoryPage from "./pages/RouteHistoryPage";
import SubscriptionPage from "./pages/SubscriptionPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouteHistoryProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected Routes */}
            <Route 
              path="/app" 
              element={
                <PrivateRoute>
                  <Index />
                </PrivateRoute>
              } 
            />
            
            {/* Admin Panel */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute>
                  <AdminPanel />
                </PrivateRoute>
              } 
            />
            
            {/* Histórico de Rotas */}
            <Route 
              path="/history" 
              element={
                <PrivateRoute>
                  <RouteHistoryPage />
                </PrivateRoute>
              } 
            />
            
            {/* Assinatura */}
            <Route 
              path="/subscription" 
              element={
                <PrivateRoute>
                  <SubscriptionPage />
                </PrivateRoute>
              } 
            />
            
            {/* Catch All - Redirect to home instead of NotFound page */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RouteHistoryProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
