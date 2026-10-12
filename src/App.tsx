import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { SetupScreen } from '@/components/SetupScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PatrimoniosPage } from '@/pages/patrimonios/PatrimoniosPage';
import { EmpresasPage } from '@/pages/empresas/EmpresasPage';
import { SetoresPage } from '@/pages/setores/SetoresPage';
import { MovimentacoesPage } from '@/pages/movimentacoes/MovimentacoesPage';
import { RelatoriosPage } from '@/pages/relatorios/RelatoriosPage';
import { InventarioPage } from '@/pages/inventario/InventarioPage';
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage';
import { ConfiguracoesPage } from '@/pages/configuracoes/ConfiguracoesPage';

function AppRoutes() {
  const { enableDemoMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="spinner w-10 h-10 mx-auto mb-4" />
          <p className="text-sm text-surface-500 font-medium">Iniciando PatriControl...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupScreen onEnableDemoMode={enableDemoMode} />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patrimonios" element={<PatrimoniosPage />} />
        <Route path="/empresas" element={<EmpresasPage />} />
        <Route path="/setores" element={<SetoresPage />} />
        <Route path="/movimentacoes" element={<MovimentacoesPage />} />
        <Route path="/historico" element={<MovimentacoesPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute requiredRole={['ADMINISTRADOR']}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute requiredRole={['ADMINISTRADOR']}>
              <ConfiguracoesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                fontSize: '0.875rem',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
