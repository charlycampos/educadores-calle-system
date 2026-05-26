import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { NnaListPage } from './features/nna/NnaListPage';
import { NnaCreatePage } from './features/nna/NnaCreatePage';
import { NnaFichaPage } from './features/nna/NnaFichaPage';
import { ExpedientePage } from './features/nna/ExpedientePage';
import { UserListPage } from './features/users/UserListPage';
import { TalleresPage } from './features/talleres/TalleresPage';
import { MainLayout } from './components/layout/MainLayout';
import { useAuthStore } from './store/auth.store';
import React, { useEffect } from 'react';

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
import { AdminNacionalDashboard } from './features/dashboard/AdminNacionalDashboard';
import { SedesPage } from './features/sedes/SedesPage';
import { ReportesPage } from './features/reportes/ReportesPage';
import { MonitorAuditoriaPage } from './features/dashboard/MonitorAuditoriaPage';
import { MonitorTrasladosPage } from './features/dashboard/MonitorTrasladosPage';
import { CoordinadorDerivacionesPage } from './features/dashboard/CoordinadorDerivacionesPage';
import { CoordinadorCasosPage } from './features/dashboard/CoordinadorCasosPage';

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
