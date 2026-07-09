import { google } from "googleapis";

/**
 * All scopes requested during the OAuth flow.
 * Using broader gmail.modify scope ensures we can read thread IDs for future
 * reply-tracking without needing a second consent round.
 */
export const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

let lastGmailApiResponse: unknown = null;
let lastOAuthError: string | null = null;

export function setLastGmailApiResponse(response: unknown) {
  lastGmailApiResponse = response;
}

export function setLastOAuthError(error: string | null) {
  lastOAuthError = error;
}

export function getGmailDiagnosticsState() {
  return { lastGmailApiResponse, lastOAuthError };
}

export function getRedirectUri(): string {

  // Always prefer the production domain if available.
  const productionDomain =
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();

  if (productionDomain) {
    return `https://${productionDomain}/api/gmail/callback`;
  }

  const devDomain = process.env.REPLIT_DEV_DOMAIN;

  if (devDomain) {
    return `https://${devDomain}/api/gmail/callback`;
  }

  throw new Error(
    "No REPLIT_DOMAINS or REPLIT_DEV_DOMAIN configured."
  );
}

export function getFrontendUrl() {

  const productionDomain =
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();

  if (productionDomain) {
    return `https://${productionDomain}`;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  throw new Error(
    "No frontend domain configured."
  );
}

export function createOAuthClient(tokens?: {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set. " +
        "Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID.",
    );
  }

  const redirectUri = getRedirectUri();
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (tokens) {
    client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? undefined,
      expiry_date: tokens.tokenExpiry?.getTime() ?? undefined,
    });
  }
  return client;
}

/** Generate the Google OAuth authorization URL and log it for debugging. */
export function getAuthorizationUrl(state: string): string {
  const client = createOAuthClient();
  const redirectUri = getRedirectUri();

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token on every authorization
    include_granted_scopes: true,
    scope: GMAIL_SCOPES,
    state,
  });

  console.log("[GMAIL OAUTH] ─── Authorization URL generation ───────────────────");
  console.log(`[GMAIL OAUTH] Client ID    : ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`[GMAIL OAUTH] Redirect URI : ${redirectUri}`);
  console.log(`[GMAIL OAUTH] Scopes       : ${GMAIL_SCOPES.join(" ")}`);
  console.log(`[GMAIL OAUTH] State        : ${state.substring(0, 8)}... (truncated)`);
  console.log(`[GMAIL OAUTH] Auth URL     : ${authUrl}`);
  console.log("[GMAIL OAUTH] ─────────────────────────────────────────────────────");

  return authUrl;
}

/** Build an RFC 2822 message encoded as base64url for the Gmail API. */
export function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
  signature?: string | null;
}): string {
  const fullBody = params.signature
    ? `${params.body}\n\n--\n${params.signature}`
    : params.body;

  const message = [
    "MIME-Version: 1.0",
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    fullBody,
  ].join("\r\n");

  return Buffer.from(message).toString("base64url");
}

export async function sendGmailEmail(
  auth: ReturnType<typeof createOAuthClient>,
  params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    signature?: string | null;
  },
) {
  const gmail = google.gmail({ version: "v1", auth });
  const raw = buildMimeMessage(params);
  try {
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    setLastGmailApiResponse(result.data);
    return result.data;
  } catch (err: any) {
    setLastGmailApiResponse(err?.response?.data ?? err?.message ?? err);
    throw err;
  }
}

export async function createGmailDraft(
  auth: ReturnType<typeof createOAuthClient>,
  params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    signature?: string | null;
  },
) {
  const gmail = google.gmail({ version: "v1", auth });
  const raw = buildMimeMessage(params);
  const result = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });
  return result.data;
}
