import * as React from 'react';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import { useAuthStore } from '@/features/auth/auth-store';
import { wsManager } from '@/shared/lib/ws/ws-client';
import { setUnauthorizedHandler } from '@/shared/lib/http/client';
import { AppLayout } from '@/shared/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RecipeListPage } from '@/features/recipes/RecipeListPage';
import { RecipeDetailPage } from '@/features/recipes/RecipeDetailPage';
import { TrialListPage } from '@/features/trials/TrialListPage';
import { TrialDetailPage } from '@/features/trials/TrialDetailPage';
import { TrialComparePage } from '@/features/trials/TrialComparePage';
import { MasterDataPage } from '@/features/masterdata/MasterDataPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

wsManager.setQueryClient(queryClient);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <span className="text-xs text-slate-500 font-medium">กำลังเตรียมระบบ...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function App() {
  const { checkAuth, logout } = useAuthStore();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    checkAuth();
  }, [checkAuth, logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/recipes" replace />} />
            <Route path="recipes" element={<RecipeListPage />} />
            <Route path="recipes/:id" element={<RecipeDetailPage />} />
            <Route path="trials" element={<TrialListPage />} />
            <Route path="trials/compare" element={<TrialComparePage />} />
            <Route path="trials/:id" element={<TrialDetailPage />} />
            <Route path="masterdata" element={<MasterDataPage />} />
            <Route path="*" element={<Navigate to="/recipes" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
export default App;
