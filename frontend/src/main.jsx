import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import api from './services/api';
import AuthSpecPage from './pages/AuthSpecPage';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Contacts = lazy(() => import('./pages/Contacts'));
const CRM = lazy(() => import('./pages/CRM'));
const Users = lazy(() => import('./pages/Users'));
const Teams = lazy(() => import('./pages/Teams'));
const Settings = lazy(() => import('./pages/Settings'));
const Connections = lazy(() => import('./pages/Connections'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const QuickResponses = lazy(() => import('./pages/QuickResponses'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const LeadScraper = lazy(() => import('./pages/LeadScraper'));
const RevGuard = lazy(() => import('./pages/RevGuard'));
const LegalDemo = lazy(() => import('./pages/LegalDemo'));
const BankReviewLanding = lazy(() => import('./pages/BankReviewLanding'));
const InstitutionalSite = lazy(() => import('./pages/InstitutionalSite'));

// Interceptor global para tratar erros de autenticacao (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || '');
    const isLoginRequest = requestUrl.endsWith('/auth/login');

    // A tentativa de login deve permanecer no portal da empresa para que o
    // slug continue sendo enviado. Redirecionar para /login transforma um
    // 401 de credenciais em um novo login global, bloqueado para admins.
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.clear();
      const tenantLogin = window.location.pathname.match(/^\/([^/]+)\/login(?:\/)?$/);
      window.location.href = tenantLogin ? `/${tenantLogin[1]}/login` : '/login';
    }
    return Promise.reject(error);
  }
);

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      Carregando...
    </div>
  );
}

async function hardReloadApplication() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if (window.caches?.keys) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    }
  } catch (error) {
    console.warn('[frontend] falha ao limpar cache de recuperacao:', error);
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set('__reload', Date.now().toString());
    window.location.replace(url.toString());
  }
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[frontend] erro de renderizacao:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-base)',
            color: 'var(--text-main)',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>Nao foi possivel carregar esta tela</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '28rem' }}>
            Atualize a pagina para carregar a versao mais recente do sistema.
          </p>
          <button
            type="button"
            onClick={hardReloadApplication}
            style={{
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.85rem 1.2rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Atualizar agora
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<InstitutionalSite />} />
          <Route path="/login" element={<Login />} />
          <Route path="/:slug/login" element={<Login />} />
          <Route path="/validation/auth-spec" element={<AuthSpecPage />} />
          <Route path="/demo-juridico" element={<LegalDemo demoMode />} />
          <Route path="/revisional-bancario" element={<BankReviewLanding />} />
          <Route path="/juridico" element={<PrivateRoute><LegalDemo /></PrivateRoute>} />
          <Route path="/inbox" element={<PrivateRoute><LegalDemo initialScreen="atendimentos" /></PrivateRoute>} />

          <Route
            element={(
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            )}
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/users" element={<Users />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/os" element={<Navigate to="/inbox" replace />} />
            <Route path="/quick-responses" element={<QuickResponses />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/leads" element={<LeadScraper />} />
            <Route path="/revenue" element={<RevGuard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  </BrowserRouter>
);
