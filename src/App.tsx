import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
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
            <Route
              path="/patrimonios"
              element={
                <PlaceholderPage
                  title="Patrimônios"
                  subtitle="Cadastro e consulta de bens patrimoniais"
                />
              }
            />
            <Route
              path="/empresas"
              element={
                <PlaceholderPage
                  title="Empresas"
                  subtitle="Gerenciamento das empresas cadastradas"
                />
              }
            />
            <Route
              path="/setores"
              element={
                <PlaceholderPage
                  title="Setores"
                  subtitle="Gerenciamento dos setores organizacionais"
                />
              }
            />
            <Route
              path="/movimentacoes"
              element={
                <PlaceholderPage
                  title="Movimentações"
                  subtitle="Transferências e movimentações de patrimônios"
                />
              }
            />
            <Route
              path="/historico"
              element={
                <PlaceholderPage
                  title="Histórico"
                  subtitle="Histórico completo de movimentações"
                />
              }
            />
            <Route
              path="/relatorios"
              element={
                <PlaceholderPage
                  title="Relatórios"
                  subtitle="Relatórios e exportações do inventário"
                />
              }
            />
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
