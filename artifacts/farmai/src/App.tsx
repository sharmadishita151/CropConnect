import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { AuthPage, BuyerDashboard, BuyerOrders, FarmerDashboard, FarmerListings, getLanguage, readUser, SettingsPage } from '@/pages/farmai-pages';
import type { AuthUser } from '@workspace/api-client-react';
import type { Language } from '@/lib/i18n';

const queryClient = new QueryClient();

function guestUser(role: 'farmer' | 'buyer'): AuthUser {
  return { id: 'guest', phone: '', role, name: role === 'farmer' ? 'Farmer' : 'Buyer' };
}

function Workspace({ role, children }: { role: 'farmer' | 'buyer'; children: (user: AuthUser, language: Language, setLanguage: (language: Language) => void) => ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getLanguage);
  const user = readUser();
  function setLanguage(value: Language) {
    setLanguageState(value);
    localStorage.setItem('farmai-language', value);
  }
  if (!user || user.role !== role) return <Redirect to="/" />;
  return children(user, language, setLanguage);
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/farmer">
          <Workspace role="farmer">{(user, language, setLanguage) => <FarmerDashboard user={user} language={language} setLanguage={setLanguage} />}</Workspace>
        </Route>
        <Route path="/farmer/listings">
          <Workspace role="farmer">{(user, language, setLanguage) => <FarmerListings user={user} language={language} setLanguage={setLanguage} />}</Workspace>
        </Route>
        <Route path="/buyer">
          <Workspace role="buyer">{(user, language, setLanguage) => <BuyerDashboard user={user} language={language} setLanguage={setLanguage} />}</Workspace>
        </Route>
        <Route path="/buyer/orders">
          <Workspace role="buyer">{(user, language, setLanguage) => <BuyerOrders user={user} language={language} setLanguage={setLanguage} />}</Workspace>
        </Route>
        <Route path="/settings">
          <Workspace role={readUser()?.role ?? 'farmer'}>{(user, language, setLanguage) => <SettingsPage user={user} language={language} setLanguage={setLanguage} />}</Workspace>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
