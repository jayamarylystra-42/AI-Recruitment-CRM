import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import Landing from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import Companies from '@/pages/companies/index';
import CompanyDetail from '@/pages/companies/[id]';
import Campaigns from '@/pages/campaigns/index';
import CampaignDetail from '@/pages/campaigns/[id]';
import Emails from '@/pages/emails/index';
import ComposeEmail from '@/pages/emails/compose';
import Analytics from '@/pages/analytics';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import OAuthTest from '@/pages/oauth-test';
import GmailDiagnostics from '@/pages/gmail-diagnostics';
import NotFound from '@/pages/not-found';
import { Layout } from '@/components/layout/layout';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(217.2, 91.2%, 59.8%)",
    colorForeground: "hsl(210, 40%, 98%)",
    colorMutedForeground: "hsl(215, 20.2%, 65.1%)",
    colorDanger: "hsl(0, 62.8%, 30.6%)",
    colorBackground: "hsl(222, 47%, 11%)",
    colorInput: "hsl(217.2, 32.6%, 17.5%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(217.2, 32.6%, 17.5%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card border-border border rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground text-2xl font-bold tracking-tight",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-500",
    alertText: "text-destructive-foreground",
    logoBox: "flex justify-center",
    logoImage: "h-12 w-auto object-contain",
    socialButtonsBlockButton: "border-border hover:bg-accent/50 transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md h-10",
    formFieldInput: "bg-input border-border text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all rounded-md h-10 px-3",
    footerAction: "flex items-center justify-center gap-2",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border border-destructive/20 text-destructive rounded-md",
    otpCodeFieldInput: "bg-input border-border text-foreground focus:ring-primary",
    formFieldRow: "space-y-2",
    main: "space-y-6",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      <div className="z-10 w-full flex justify-center">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      <div className="z-10 w-full flex justify-center">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

const queryClient = new QueryClient();

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Component />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/companies" component={() => <ProtectedRoute component={Companies} />} />
      <Route path="/companies/:id" component={() => <ProtectedRoute component={CompanyDetail} />} />
      <Route path="/campaigns" component={() => <ProtectedRoute component={Campaigns} />} />
      <Route path="/campaigns/:id" component={() => <ProtectedRoute component={CampaignDetail} />} />
      <Route path="/emails" component={() => <ProtectedRoute component={Emails} />} />
      <Route path="/emails/compose" component={() => <ProtectedRoute component={ComposeEmail} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/gmail-diagnostics" component={() => <ProtectedRoute component={GmailDiagnostics} />} />

      {/* Public diagnostics page — accessible without login */}
      <Route path="/oauth-test" component={OAuthTest} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
