import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PatrimoniosPage } from '@/pages/patrimonios/PatrimoniosPage';
import { EmpresasPage } from '@/pages/empresas/EmpresasPage';
import { SetoresPage } from '@/pages/setores/SetoresPage';
import { MovimentacoesPage } from '@/pages/movimentacoes/MovimentacoesPage';
import { RelatoriosPage } from '@/pages/relatorios/RelatoriosPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

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
            <Route
              path="/historico"
              element={<MovimentacoesPage />}
            />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute requiredRole={['ADMINISTRADOR']}>
                  <PlaceholderPage
                    title="Usuários"
                    subtitle="Gerenciamento de usuários e permissões"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute requiredRole={['ADMINISTRADOR']}>
                  <PlaceholderPage
                    title="Configurações"
                    subtitle="Configurações gerais do sistema"
                  />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

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
  );
}

export default App;
