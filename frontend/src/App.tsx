import * as React from 'react';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

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
import { EquipmentChecklistPage } from '@/features/checklist/EquipmentChecklistPage';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmProvider } from '@/shared/ui/confirm-modal';

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
      <div className="min-h-screen flex bg-slate-50">
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white p-4 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </main>
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
      <ConfirmProvider>
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
              <Route path="checklist" element={<EquipmentChecklistPage />} />
              <Route path="*" element={<Navigate to="/recipes" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
export default App;
