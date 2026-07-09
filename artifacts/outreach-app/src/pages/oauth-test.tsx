import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Copy, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DiagnosticsData {
  status: "configured" | "misconfigured";
  timestamp: string;
  environment: {
    nodeEnv: string;
    replitDevDomain: string | null;
    replitDomains: string | null;
  };
  credentials: {
    googleClientId: string;
    googleClientIdFull: string | null;
    googleClientSecretPresent: boolean;
    sessionSecretPresent: boolean;
    isWebAppCredential: boolean;
    missingVariables: string[];
  };
  oauthConfig: {
    redirectUri: string;
    frontendUrl: string;
    scopes: string[];
    accessType: string;
    prompt: string;
    includeGrantedScopes: boolean;
  };
  userConnection: {
    connected: boolean;
    email: string | null;
    tokenExpiry: string | null;
    hasRefreshToken: boolean;
    tokenExpiresIn: string | null;
  } | null;
  diagnoses: string[];
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {label}
    </span>
  );
}

function Row({ label, value, mono = false, copy = false }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copy?: boolean;
}) {
  const { toast } = useToast();
  const handleCopy = () => {
    if (typeof value === "string") {
      navigator.clipboard.writeText(value);
      toast({ title: "Copied to clipboard" });
    }
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-border/50 last:border-0">
      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-52 shrink-0 pt-0.5">{label}</dt>
      <dd className={`flex-1 text-sm break-all flex items-start gap-2 ${mono ? "font-mono" : ""}`}>
        <span>{value}</span>
        {copy && typeof value === "string" && (
          <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5">
            <Copy size={13} />
          </button>
        )}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      <dl className="px-5">{children}</dl>
    </div>
  );
}

export default function OAuthTest() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/oauth-test`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { toast } = useToast();
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">OAuth Diagnostics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time status of the Google OAuth / Gmail configuration.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 size={18} className="animate-spin" />
            Loading diagnostics…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600 dark:text-red-400">
            <strong>Failed to load:</strong> {error}
            <p className="mt-1 text-muted-foreground">Make sure the API server is running at /api.</p>
          </div>
        )}

        {data && (
          <>
            {/* Overall status */}
            <div className={`rounded-xl border p-5 flex items-start gap-3 ${
              data.status === "configured"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}>
              {data.status === "configured"
                ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                : <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className="font-semibold text-sm">
                  {data.status === "configured" ? "OAuth credentials are configured" : "OAuth credentials are NOT configured"}
                </p>
                {data.credentials.missingVariables.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Missing: {data.credentials.missingVariables.join(", ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last checked: {new Date(data.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Diagnoses / Action items */}
            {data.diagnoses.length > 0 && (
              <Section title="⚠️ Action Items (Most Likely Causes of 403)">
                <div className="py-3 space-y-3">
                  {data.diagnoses.map((d, i) => {
                    const [label, ...rest] = d.split(": ");
                    return (
                      <div key={i} className="flex gap-2 text-sm">
                        <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>{label}:</strong>{" "}
                          {rest.join(": ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Credentials */}
            <Section title="Credentials">
              <Row
                label="Google Client ID"
                value={
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs">{data.credentials.googleClientId}</span>
                    {data.credentials.googleClientIdFull && (
                      <button onClick={() => copy(data.credentials.googleClientIdFull!)} className="text-muted-foreground hover:text-foreground">
                        <Copy size={13} />
                      </button>
                    )}
                  </span>
                }
              />
              <Row
                label="Client ID format"
                value={
                  <StatusBadge
                    ok={data.credentials.isWebAppCredential}
                    label={data.credentials.isWebAppCredential ? "Web Application ✓" : "Unknown — may be wrong credential type"}
                  />
                }
              />
              <Row
                label="Client Secret"
                value={<StatusBadge ok={data.credentials.googleClientSecretPresent} label={data.credentials.googleClientSecretPresent ? "Present" : "Missing"} />}
              />
              <Row
                label="Session Secret"
                value={<StatusBadge ok={data.credentials.sessionSecretPresent} label={data.credentials.sessionSecretPresent ? "Present (used for token encryption)" : "Missing"} />}
              />
            </Section>

            {/* OAuth Configuration */}
            <Section title="OAuth Configuration">
              <Row
                label="Redirect URI"
                value={
                  <span className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{data.oauthConfig.redirectUri}</code>
                    <button onClick={() => copy(data.oauthConfig.redirectUri)} className="text-muted-foreground hover:text-foreground">
                      <Copy size={13} />
                    </button>
                  </span>
                }
              />
              <Row label="Frontend URL" value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{data.oauthConfig.frontendUrl}</code>} />
              <Row label="access_type" value={<Badge variant="secondary">{data.oauthConfig.accessType}</Badge>} />
              <Row label="prompt" value={<Badge variant="secondary">{data.oauthConfig.prompt}</Badge>} />
              <Row label="include_granted_scopes" value={<StatusBadge ok={data.oauthConfig.includeGrantedScopes} label={String(data.oauthConfig.includeGrantedScopes)} />} />
              <Row
                label="Scopes"
                value={
                  <div className="flex flex-col gap-1">
                    {data.oauthConfig.scopes.map((s) => (
                      <code key={s} className="text-xs bg-muted px-1.5 py-0.5 rounded">{s}</code>
                    ))}
                  </div>
                }
              />
            </Section>

            {/* Environment */}
            <Section title="Environment">
              <Row label="NODE_ENV" value={<Badge variant="secondary">{data.environment.nodeEnv}</Badge>} />
              <Row label="REPLIT_DEV_DOMAIN" value={data.environment.replitDevDomain ?? <span className="text-red-500 text-xs">not set</span>} mono />
              <Row label="REPLIT_DOMAINS" value={data.environment.replitDomains ?? <span className="text-muted-foreground text-xs">(production only)</span>} mono />
            </Section>

            {/* Connected Account */}
            <Section title="Connected Account (requires login)">
              {data.userConnection === null ? (
                <div className="py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Info size={14} />
                  Sign in to see your connected Gmail account status.
                </div>
              ) : data.userConnection.connected ? (
                <>
                  <Row label="Status" value={<StatusBadge ok label="Connected" />} />
                  <Row label="Gmail Address" value={data.userConnection.email ?? "—"} />
                  <Row label="Has Refresh Token" value={<StatusBadge ok={data.userConnection.hasRefreshToken} label={data.userConnection.hasRefreshToken ? "Yes" : "No (re-connect required when access token expires)"} />} />
                  <Row
                    label="Token Expiry"
                    value={
                      data.userConnection.tokenExpiresIn === "EXPIRED"
                        ? <span className="text-red-500 text-sm font-medium">EXPIRED — will auto-refresh on next API call</span>
                        : data.userConnection.tokenExpiresIn
                        ? `Expires in ${data.userConnection.tokenExpiresIn}`
                        : "Unknown"
                    }
                  />
                </>
              ) : (
                <div className="py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <XCircle size={14} className="text-muted-foreground" />
                  No Gmail account connected for your user.
                </div>
              )}
            </Section>

            {/* Setup instructions */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 text-sm space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Info size={15} className="text-blue-500" />
                Google Cloud Console Setup Checklist
              </h3>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-500 underline">console.cloud.google.com</a></li>
                <li>Enable the <strong className="text-foreground">Gmail API</strong> under APIs &amp; Services → Library</li>
                <li>
                  Go to <strong className="text-foreground">APIs &amp; Services → OAuth consent screen</strong>.
                  If status is <strong>Testing</strong>, add your Google email as a <strong>Test user</strong> — this is the most common cause of 403.
                </li>
                <li>
                  Under <strong className="text-foreground">Credentials → OAuth 2.0 Client ID</strong>, add this <strong>exact</strong> Authorized redirect URI:
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-xs bg-background border border-border px-2 py-1 rounded block">{data.oauthConfig.redirectUri}</code>
                    <button onClick={() => copy(data.oauthConfig.redirectUri)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <Copy size={13} />
                    </button>
                  </div>
                </li>
                <li>Save the credentials and wait ~1 minute for changes to propagate</li>
              </ol>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-500 underline text-xs mt-1"
              >
                Open Google Cloud Credentials <ExternalLink size={12} />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
