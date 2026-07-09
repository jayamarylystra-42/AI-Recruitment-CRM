import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { gmailConnectionsTable, gmailOAuthStatesTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { google } from "googleapis";
import {
  getAuthorizationUrl,
  createOAuthClient,
  getFrontendUrl,
  getRedirectUri,
  getGmailDiagnosticsState,
  setLastOAuthError,
} from "../lib/gmail";
import { encrypt } from "../lib/crypto";

// ─── Protected routes ──────────────────────────────────────────────────────────

export const gmailRouter = Router();

// GET /api/gmail/status
gmailRouter.get("/status", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [connection] = await db
      .select({
        email: gmailConnectionsTable.email,
        tokenExpiry: gmailConnectionsTable.tokenExpiry,
      })
      .from(gmailConnectionsTable)
      .where(eq(gmailConnectionsTable.userId, userId))
      .limit(1);

    res.json({
      connected: !!connection,
      email: connection?.email ?? null,
      tokenExpiry: connection?.tokenExpiry ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get Gmail status" });
  }
});

// GET /api/gmail/auth — generates OAuth URL and returns it to the client
// GET /api/gmail/diagnostics
gmailRouter.get("/diagnostics", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [connection] = await db
      .select({
        email: gmailConnectionsTable.email,
        grantedScopes: gmailConnectionsTable.grantedScopes,
        tokenExpiry: gmailConnectionsTable.tokenExpiry,
      })
      .from(gmailConnectionsTable)
      .where(eq(gmailConnectionsTable.userId, userId))
      .limit(1);

    const diagnostics = getGmailDiagnosticsState();

    res.json({
      connectedEmail: connection?.email ?? null,
      grantedScopes: connection?.grantedScopes ?? null,
      redirectUri: getRedirectUri(),
      tokenExpiry: connection?.tokenExpiry ?? null,
      clientIdExists: !!process.env.GOOGLE_CLIENT_ID,
      clientSecretExists: !!process.env.GOOGLE_CLIENT_SECRET,
      sessionSecretExists: !!process.env.SESSION_SECRET,
      lastGmailApiResponse: diagnostics.lastGmailApiResponse,
      lastOAuthError: diagnostics.lastOAuthError,
      gmailConnected: !!connection,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get Gmail diagnostics" });
  }
});

gmailRouter.get("/auth", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Fail fast with a clear error if credentials aren't set up
  if (!clientId || !clientSecret) {
    console.error("[GMAIL OAUTH] ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    res.status(500).json({
      error: "Google OAuth credentials are not configured on this server.",
      setup: true,
      missing: [
        ...(!clientId ? ["GOOGLE_CLIENT_ID"] : []),
        ...(!clientSecret ? ["GOOGLE_CLIENT_SECRET"] : []),
      ],
    });
    return;
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const state = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Opportunistic cleanup of expired states
    await db.delete(gmailOAuthStatesTable).where(lt(gmailOAuthStatesTable.expiresAt, new Date()));

    await db.insert(gmailOAuthStatesTable).values({ state, userId, expiresAt });

    const authUrl = getAuthorizationUrl(state); // logs URL + redirect URI
    res.json({ authUrl });
  } catch (err) {
    req.log.error(err);
    console.error("[GMAIL OAUTH] ERROR generating auth URL:", err);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// DELETE /api/gmail/disconnect
gmailRouter.delete("/disconnect", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    await db.delete(gmailConnectionsTable).where(eq(gmailConnectionsTable.userId, userId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to disconnect Gmail" });
  }
});

// ─── Public callback — Google redirects here, no auth headers present ─────────

export const gmailCallbackRouter = Router();

// GET /api/gmail/callback
gmailCallbackRouter.get("/", async (req, res) => {
  const frontendUrl = getFrontendUrl();
  const settingsUrl = `${frontendUrl}/settings`;

  // Log ALL incoming query parameters for debugging
  console.log("[GMAIL OAUTH] ─── Callback received ─────────────────────────────────");
  console.log("[GMAIL OAUTH] Query params:", JSON.stringify(req.query, null, 2));
  console.log("[GMAIL OAUTH] Redirect URI (server-computed):", getRedirectUri());
  console.log("[GMAIL OAUTH] Request URL:", req.url);

  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    // Google returned an error — log the exact message and redirect with it
    if (error) {
      setLastOAuthError(error_description ? `${error}: ${error_description}` : error);
      console.error("[GMAIL OAUTH] Google returned error:", error);
      console.error("[GMAIL OAUTH] Google error_description:", error_description ?? "(none)");
      console.error("[GMAIL OAUTH] ─────────────────────────────────────────────────────");

      const message = error_description
        ? `${error}: ${error_description}`
        : error;

      res.redirect(
        `${settingsUrl}?gmail=error&message=${encodeURIComponent(message)}&google_error=${encodeURIComponent(error)}`,
      );
      return;
    }

    if (!code || !state) {
      setLastOAuthError("Missing OAuth parameters");
      console.error("[GMAIL OAUTH] Missing code or state parameter");
      console.error("[GMAIL OAUTH] ─────────────────────────────────────────────────────");
      res.redirect(`${settingsUrl}?gmail=error&message=Missing+OAuth+parameters`);
      return;
    }

    // Validate state from DB (one-time use CSRF token)
    const [stateRow] = await db
      .select()
      .from(gmailOAuthStatesTable)
      .where(eq(gmailOAuthStatesTable.state, state))
      .limit(1);

    if (!stateRow) {
      setLastOAuthError("Invalid or expired state");
      console.error("[GMAIL OAUTH] State not found in DB — possible CSRF or expired session");
      res.redirect(`${settingsUrl}?gmail=error&message=Invalid+or+expired+state.+Please+try+connecting+again.`);
      return;
    }

    // One-time delete
    await db.delete(gmailOAuthStatesTable).where(eq(gmailOAuthStatesTable.state, state));

    if (new Date() > stateRow.expiresAt) {
      setLastOAuthError("OAuth session expired");
      console.error("[GMAIL OAUTH] State expired at", stateRow.expiresAt);
      res.redirect(`${settingsUrl}?gmail=error&message=OAuth+session+expired%2C+please+try+again`);
      return;
    }

    const userId = stateRow.userId;
    console.log("[GMAIL OAUTH] State valid for userId:", userId);

    // Exchange authorization code for tokens
    console.log("[GMAIL OAUTH] Exchanging authorization code for tokens...");
    const auth = createOAuthClient();
    let tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
      scope?: string | null;
      token_type?: string | null;
    };
    try {
      const result = await auth.getToken(code);
      tokens = result.tokens;
    } catch (tokenErr: any) {
      const googleErr = tokenErr?.response?.data;
      console.error("[GMAIL OAUTH] Token exchange FAILED");
      console.error("[GMAIL OAUTH] Google error response:", JSON.stringify(googleErr ?? tokenErr?.message, null, 2));
      console.error("[GMAIL OAUTH] ─────────────────────────────────────────────────────");

      const msg = googleErr?.error_description ?? googleErr?.error ?? tokenErr?.message ?? "Token exchange failed";
      setLastOAuthError(msg);
      res.redirect(`${settingsUrl}?gmail=error&message=${encodeURIComponent(msg)}`);
      return;
    }

    console.log("[GMAIL OAUTH] ─── Token response ────────────────────────────────────");
    console.log("[GMAIL OAUTH] access_token  :", tokens.access_token ? "PRESENT" : "MISSING");
    console.log("[GMAIL OAUTH] refresh_token :", tokens.refresh_token ? "PRESENT" : "MISSING (normal on re-auth if prompt=consent was skipped)");
    console.log("[GMAIL OAUTH] expiry_date   :", tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : "not set");
    console.log("[GMAIL OAUTH] scope         :", tokens.scope ?? "(not returned)");
    console.log("[GMAIL OAUTH] token_type    :", tokens.token_type ?? "(not returned)");
    console.log("[GMAIL OAUTH] ─────────────────────────────────────────────────────");

    if (!tokens.access_token) {
      setLastOAuthError("No access token returned from Google");
      console.error("[GMAIL OAUTH] No access_token in response — aborting");
      res.redirect(`${settingsUrl}?gmail=error&message=No+access+token+returned+from+Google`);
      return;
    }

    auth.setCredentials({
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
    });

    // Get the authenticated user's email address
    const oauth2 = google.oauth2({ version: "v2", auth });
    let email: string | null | undefined;
    try {
      const userInfo = await oauth2.userinfo.get();
      email = userInfo.data.email;
      console.log("[GMAIL OAUTH] Authenticated Gmail address:", email);
    } catch (userInfoErr: any) {
      console.error("[GMAIL OAUTH] Failed to fetch userinfo:", userInfoErr?.message);
    }

    if (!email) {
      setLastOAuthError("Could not retrieve Gmail address");
      res.redirect(`${settingsUrl}?gmail=error&message=Could+not+retrieve+Gmail+address`);
      return;
    }

    // Encrypt tokens before writing to DB
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    await db
      .insert(gmailConnectionsTable)
      .values({
        userId,
        email,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        grantedScopes: tokens.scope ?? null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      })
      .onConflictDoUpdate({
        target: gmailConnectionsTable.userId,
        set: {
          email,
          accessToken: encryptedAccess,
          ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}),
          grantedScopes: tokens.scope ?? null,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          updatedAt: new Date(),
        },
      });

    setLastOAuthError(null);
    console.log("[GMAIL OAUTH] Connection stored for:", email);
    console.log("[GMAIL OAUTH] ─── OAuth flow complete ───────────────────────────────");

    res.redirect(`${settingsUrl}?gmail=connected`);
  } catch (err: any) {
    setLastOAuthError(err?.message ?? "Authentication failed");
    console.error("[GMAIL OAUTH] Unhandled error in callback:", err?.message ?? err);
    req.log.error(err);
    res.redirect(`${settingsUrl}?gmail=error&message=Authentication+failed`);
  }
});
