import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { UserProfile } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGmailStatus, getGmailAuthUrl, disconnectGmail, type GmailStatus } from "@/lib/gmail-api";

export default function Settings() {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const refreshStatus = useCallback(async () => {
    try {
      setGmailLoading(true);
      const status = await getGmailStatus();
      setGmailStatus(status);
    } catch {
      setGmailStatus({ connected: false, email: null });
    } finally {
      setGmailLoading(false);
    }
  }, []);

  // On mount: check for OAuth callback result in query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    const message = params.get("message");

    if (gmail === "connected") {
      toast({ title: "Gmail connected successfully!", className: "bg-emerald-500 text-white" });
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gmail === "error") {
      toast({
        title: "Gmail connection failed",
        description: message ? decodeURIComponent(message) : "Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    refreshStatus();
  }, [refreshStatus]);

  const handleConnectGmail = async () => {
    try {
      setConnectingGmail(true);
      const result = await getGmailAuthUrl();
      // Server signals missing credentials → send user to diagnostics page
      if ((result as any).setup === true) {
        const missing = ((result as any).missing as string[] | undefined)?.join(", ") ?? "unknown";
        toast({
          title: "Gmail not configured",
          description: `Missing server credentials: ${missing}. See /oauth-test for setup instructions.`,
          variant: "destructive",
        });
        window.location.href = "/oauth-test";
        return;
      }
      // Redirect the current tab — Google will redirect back to /settings?gmail=connected
      window.location.href = result.authUrl;
    } catch (err: any) {
      toast({ title: "Failed to start Gmail connection", description: err.message, variant: "destructive" });
      setConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      setDisconnectingGmail(true);
      await disconnectGmail();
      setGmailStatus({ connected: false, email: null });
      toast({ title: "Gmail disconnected" });
    } catch (err: any) {
      toast({ title: "Failed to disconnect Gmail", description: err.message, variant: "destructive" });
    } finally {
      setDisconnectingGmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and connected services.</p>
      </div>

      {/* Gmail Integration */}
      <Card className="max-w-4xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail size={20} className="text-primary" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to send outreach emails and create drafts directly from the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gmailLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 size={16} className="animate-spin" />
              Checking connection…
            </div>
          ) : gmailStatus?.connected ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Gmail connected</p>
                  <p className="text-muted-foreground text-sm">{gmailStatus.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectGmail}
                disabled={disconnectingGmail}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                {disconnectingGmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/20 border border-dashed rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle size={20} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">No Gmail account connected</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Required to send emails and create drafts.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectGmail}
                disabled={connectingGmail}
                className="gap-2 shrink-0"
              >
                {connectingGmail ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                Connect Gmail
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clerk UserProfile */}
      <div className="max-w-4xl mx-auto flex justify-center">
        <div className="w-full">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full border-border border shadow-sm rounded-xl",
                navbar: "hidden md:flex border-r border-border",
                navbarButton: "text-foreground hover:bg-muted",
                headerTitle: "text-foreground font-bold",
                headerSubtitle: "text-muted-foreground",
                profileSectionTitle: "text-foreground font-semibold border-b pb-2",
                profileSectionContent: "text-foreground",
                profilePage: "px-8 py-6",
                accordionTriggerButton: "text-foreground hover:bg-muted/50 rounded-md",
                badge: "bg-primary text-primary-foreground",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
