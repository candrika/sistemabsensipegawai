import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Karyawan from "@/pages/karyawan";
import KaryawanDetail from "@/pages/karyawan-detail";
import Absensi from "@/pages/absensi";
import Dokumen from "@/pages/dokumen";
import DokumenList from "@/pages/dokumen-list";
import Inventori from "@/pages/inventori";
import Keluhan from "@/pages/keluhan";
import RoleManager from "@/pages/role-manager";
import UserManager from "@/pages/user-manager";
import Penjual from "@/pages/penjualan";
import Pelanggan from "@/pages/pelanggan";
import Login from "@/pages/login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, permission }: { component: React.ComponentType; permission?: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        {!user ? (
          <Redirect to="/login" />
        ) : (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/karyawan" component={Karyawan} />
              <Route path="/penjual" component={Penjual} />
              <Route path="/pelanggan" component={Pelanggan} />
              <Route path="/karyawan/:id" component={KaryawanDetail} />
              <Route path="/absensi" component={Absensi} />
              <Route path="/dokumen" component={Dokumen} />
              <Route path="/dokumen/:type" component={DokumenList} />
              <Route path="/inventori" component={Inventori} />
              <Route path="/keluhan" component={Keluhan} />
              <Route path="/role-manager" component={RoleManager} />
              <Route path="/user-manager" component={UserManager} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
