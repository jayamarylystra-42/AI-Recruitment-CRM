import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface GmailDiagnosticsData {
  connectedEmail: string | null;
  grantedScopes: string | null;
  redirectUri: string;
  tokenExpiry: string | null;
  clientIdExists: boolean;
  clientSecretExists: boolean;
  sessionSecretExists: boolean;
  lastGmailApiResponse: unknown;
  lastOAuthError: string | null;
  gmailConnected: boolean;
}

async function getClerkToken(): Promise<string | null> {
  try {
    return await (window as any).Clerk?.session?.getToken() ?? null;
  } catch {
    return null;
  }
}

function Status({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {ok ? "Yes" : "No"}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/50 py-2.5 last:border-0 sm:flex-row sm:items-start">
      <dt className="w-52 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="flex-1 break-all text-sm">{value}</dd>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">None</span>;
  if (typeof value === "boolean") return <Status ok={value} />;
  if (typeof value === "string") return value;
  return <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>;
}

export default function GmailDiagnostics() {
  const [data, setData] = useState<GmailDiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getClerkToken();
      const res = await fetch(`${BASE_URL}/api/gmail/diagnostics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setData(body);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load Gmail diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gmail Diagnostics</h1>
          <p className="text-muted-foreground">Read-only Gmail OAuth and API status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          Loading diagnostics...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <dl className="rounded-xl border border-border bg-card px-5 shadow-sm">
          <Row label="Connected Gmail address" value={formatValue(data.connectedEmail)} />
          <Row label="Granted scopes" value={formatValue(data.grantedScopes)} />
          <Row label="Redirect URI" value={<code className="text-xs">{data.redirectUri}</code>} />
          <Row label="Token expiry" value={formatValue(data.tokenExpiry ? new Date(data.tokenExpiry).toLocaleString() : null)} />
          <Row label="Client ID exists" value={formatValue(data.clientIdExists)} />
          <Row label="Client Secret exists" value={formatValue(data.clientSecretExists)} />
          <Row label="Session Secret exists" value={formatValue(data.sessionSecretExists)} />
          <Row label="Last Gmail API response" value={formatValue(data.lastGmailApiResponse)} />
          <Row label="Last OAuth error" value={formatValue(data.lastOAuthError)} />
          <Row label="Gmail connected?" value={formatValue(data.gmailConnected)} />
        </dl>
      )}
    </div>
  );
}
