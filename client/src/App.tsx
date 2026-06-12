import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { useAuthStore } from './store/auth.store';
import React, { useEffect, lazy, Suspense } from 'react';

// Páginas con carga diferida (code-splitting): cada una se descarga solo al navegar a su ruta
const DashboardPage     = lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NnaListPage       = lazy(() => import('./features/nna/NnaListPage').then(m => ({ default: m.NnaListPage })));
const NnaCreatePage     = lazy(() => import('./features/nna/NnaCreatePage').then(m => ({ default: m.NnaCreatePage })));
const NnaFichaPage      = lazy(() => import('./features/nna/NnaFichaPage').then(m => ({ default: m.NnaFichaPage })));
const ExpedientePage    = lazy(() => import('./features/nna/ExpedientePage').then(m => ({ default: m.ExpedientePage })));
const UserListPage      = lazy(() => import('./features/users/UserListPage').then(m => ({ default: m.UserListPage })));
const TalleresPage      = lazy(() => import('./features/talleres/TalleresPage').then(m => ({ default: m.TalleresPage })));
const UrgenciasListPage = lazy(() => import('./features/nna/UrgenciasListPage').then(m => ({ default: m.UrgenciasListPage })));
const FormularioF15Page = lazy(() => import('./features/nna/FormularioF15Page').then(m => ({ default: m.FormularioF15Page })));

// Rutas protegidas CON sidebar (páginas internas)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

// Rutas protegidas SIN sidebar (menú principal tiene su propio layout)
const ProtectedRoutePlain = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

import { MainMenu } from './features/dashboard/MainMenu';
import { ToastContainer } from './components/ui/Toast';
import { ConfirmDialogContainer } from './components/ui/ConfirmDialog';

const AdminNacionalDashboard      = lazy(() => import('./features/dashboard/AdminNacionalDashboard').then(m => ({ default: m.AdminNacionalDashboard })));
const SedesPage                   = lazy(() => import('./features/sedes/SedesPage').then(m => ({ default: m.SedesPage })));
const ReportesPage                = lazy(() => import('./features/reportes/ReportesPage').then(m => ({ default: m.ReportesPage })));
const MonitorAuditoriaPage        = lazy(() => import('./features/dashboard/MonitorAuditoriaPage').then(m => ({ default: m.MonitorAuditoriaPage })));
const MonitorTrasladosPage        = lazy(() => import('./features/dashboard/MonitorTrasladosPage').then(m => ({ default: m.MonitorTrasladosPage })));
const CoordinadorDerivacionesPage = lazy(() => import('./features/dashboard/CoordinadorDerivacionesPage').then(m => ({ default: m.CoordinadorDerivacionesPage })));
const CoordinadorCasosPage        = lazy(() => import('./features/dashboard/CoordinadorCasosPage').then(m => ({ default: m.CoordinadorCasosPage })));
const CoordinadorDiariosPage      = lazy(() => import('./features/dashboard/CoordinadorDiariosPage').then(m => ({ default: m.CoordinadorDiariosPage })));

// Indicador de carga mientras se descarga el código de la página
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#666' }}>
    Cargando…
  </div>
);

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <ConfirmDialogContainer />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />

        {/* Protected Routes Application */}
        <Route path="/" element={
          <ProtectedRoutePlain>
            <MainMenu />
          </ProtectedRoutePlain>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/coordinador/derivaciones" element={
          <ProtectedRoute>
            <CoordinadorDerivacionesPage />
          </ProtectedRoute>
        } />

        <Route path="/coordinador/casos" element={
          <ProtectedRoute>
            <CoordinadorCasosPage />
          </ProtectedRoute>
        } />

        <Route path="/coordinador/diarios" element={
          <ProtectedRoute>
            <CoordinadorDiariosPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard-nacional" element={
          <ProtectedRoute>
            <AdminNacionalDashboard />
          </ProtectedRoute>
        } />

        <Route path="/monitor/auditoria" element={
          <ProtectedRoute>
            <MonitorAuditoriaPage />
          </ProtectedRoute>
        } />

        <Route path="/monitor/traslados" element={
          <ProtectedRoute>
            <MonitorTrasladosPage />
          </ProtectedRoute>
        } />

        <Route path="/nna" element={
          <ProtectedRoute>
            <NnaListPage />
          </ProtectedRoute>
        } />

        <Route path="/urgencias" element={
          <ProtectedRoute>
            <UrgenciasListPage />
          </ProtectedRoute>
        } />

        <Route path="/urgencias/nueva" element={
          <ProtectedRoute>
            <FormularioF15Page />
          </ProtectedRoute>
        } />

        <Route path="/urgencias/editar/:id" element={
          <ProtectedRoute>
            <FormularioF15Page />
          </ProtectedRoute>
        } />

        <Route path="/nna/nuevo" element={
          <ProtectedRoute>
            <NnaCreatePage />
          </ProtectedRoute>
        } />

        <Route path="/nna/editar/:id" element={
          <ProtectedRoute>
            <NnaCreatePage />
          </ProtectedRoute>
        } />

        <Route path="/nna/ficha/:id" element={
          <ProtectedRoute>
            <NnaFichaPage />
          </ProtectedRoute>
        } />

        <Route path="/nna/expediente/:id" element={
          <ProtectedRoute>
            <ExpedientePage />
          </ProtectedRoute>
        } />

        <Route path="/usuarios" element={
          <ProtectedRoute>
            <UserListPage />
          </ProtectedRoute>
        } />

        <Route path="/talleres" element={
          <ProtectedRoute>
            <TalleresPage />
          </ProtectedRoute>
        } />

        <Route path="/sedes" element={
          <ProtectedRoute>
            <SedesPage />
          </ProtectedRoute>
        } />

        <Route path="/reportes" element={
          <ProtectedRoute>
            <ReportesPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
