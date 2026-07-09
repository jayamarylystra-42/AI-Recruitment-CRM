/**
 * Public diagnostics endpoint for OAuth/Gmail setup debugging.
 * Returns configuration status without exposing secret values.
 * Accessible at GET /api/oauth-test
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { gmailConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getRedirectUri, getFrontendUrl, GMAIL_SCOPES } from "../lib/gmail";
import { decrypt } from "../lib/crypto";

const router = Router();

function maskSecret(val: string | undefined): string {
  if (!val) return "(not set)";
  if (val.length <= 8) return "***";
  return `${val.substring(0, 6)}...${val.substring(val.length - 4)}`;
}

router.get("/", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!sessionSecret) missing.push("SESSION_SECRET");

  let redirectUri = "(cannot compute — missing credentials)";
  let frontendUrl = "(cannot compute)";
  try {
    redirectUri = getRedirectUri();
    frontendUrl = getFrontendUrl();
  } catch { /* ignore */ }

  // Detect credential type from Client ID format
  const isWebAppCredential = clientId
    ? clientId.endsWith(".apps.googleusercontent.com")
    : false;

  // Check if Replit env vars are present
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN ?? null;
  const replitDomains = process.env.REPLIT_DOMAINS ?? null;
  const nodeEnv = process.env.NODE_ENV ?? "development";

  // User-specific data (optional auth)
  let userConnection: {
    connected: boolean;
    email: string | null;
    tokenExpiry: Date | null;
    hasRefreshToken: boolean;
    tokenExpiresIn: string | null;
  } | null = null;

  try {
    const { userId } = getAuth(req);
    if (userId) {
      const [conn] = await db
        .select()
        .from(gmailConnectionsTable)
        .where(eq(gmailConnectionsTable.userId, userId))
        .limit(1);

      if (conn) {
        const expiry = conn.tokenExpiry;
        let expiresIn: string | null = null;
        if (expiry) {
          const ms = expiry.getTime() - Date.now();
          if (ms < 0) expiresIn = "EXPIRED";
          else {
            const mins = Math.floor(ms / 60000);
            expiresIn = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
          }
        }
        userConnection = {
          connected: true,
          email: conn.email,
          tokenExpiry: expiry,
          hasRefreshToken: !!conn.refreshToken,
          tokenExpiresIn: expiresIn,
        };
      } else {
        userConnection = {
          connected: false,
          email: null,
          tokenExpiry: null,
          hasRefreshToken: false,
          tokenExpiresIn: null,
        };
      }
    }
  } catch { /* no auth — skip user section */ }

  // Diagnose likely root cause
  const diagnoses: string[] = [];
  if (!clientId || !clientSecret) {
    diagnoses.push("MISSING_CREDENTIALS: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured.");
  }
  if (clientId && !isWebAppCredential) {
    diagnoses.push("WRONG_CREDENTIAL_TYPE: Client ID does not look like a Web Application credential. Check Google Cloud Console → Credentials.");
  }
  if (!clientId) {
    // nothing more to add
  } else {
    diagnoses.push(
      "CHECK_CONSENT_SCREEN: If your OAuth consent screen is in 'Testing' mode, you must add your Google account as a Test User at console.cloud.google.com → APIs & Services → OAuth consent screen → Test users.",
    );
    diagnoses.push(
      `CHECK_REDIRECT_URI: The exact redirect URI registered in Google Cloud Console must be: ${redirectUri}`,
    );
    diagnoses.push(
      "CHECK_GMAIL_API: Ensure the Gmail API is enabled at console.cloud.google.com → APIs & Services → Library → Gmail API → Enable.",
    );
  }

  res.json({
    status: missing.length === 0 ? "configured" : "misconfigured",
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv,
      replitDevDomain,
      replitDomains,
    },
    credentials: {
      googleClientId: clientId ? maskSecret(clientId) : "(not set)",
      googleClientIdFull: clientId ?? null, // full for copy-paste verification
      googleClientSecretPresent: !!clientSecret,
      sessionSecretPresent: !!sessionSecret,
      isWebAppCredential,
      missingVariables: missing,
    },
    oauthConfig: {
      redirectUri,
      frontendUrl,
      scopes: GMAIL_SCOPES,
      accessType: "offline",
      prompt: "consent",
      includeGrantedScopes: true,
    },
    userConnection,
    diagnoses,
  });
});

export default router;
