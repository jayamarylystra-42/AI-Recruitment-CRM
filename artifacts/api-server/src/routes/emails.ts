import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable, companiesTable, activitiesTable, gmailConnectionsTable, campaignsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  CreateEmailBody,
  UpdateEmailBody,
  ListEmailsQueryParams,
} from "@workspace/api-zod";
import {
  createOAuthClient,
  sendGmailEmail,
  createGmailDraft,
} from "../lib/gmail";
import { encrypt, decrypt } from "../lib/crypto";

const router = Router();

// GET /emails
router.get("/", async (req, res) => {
  try {
    const query = ListEmailsQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};

    const conditions = [];
    if (params.campaignId) conditions.push(eq(emailsTable.campaignId, Number(params.campaignId)));
    if (params.companyId) conditions.push(eq(emailsTable.companyId, Number(params.companyId)));
    if (params.status) conditions.push(eq(emailsTable.status, params.status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = Number(params.limit ?? 50);
    const offset = Number(params.offset ?? 0);

    const emails = await db
      .select({
        id: emailsTable.id,
        companyId: emailsTable.companyId,
        campaignId: emailsTable.campaignId,
        subject: emailsTable.subject,
        body: emailsTable.body,
        signature: emailsTable.signature,
        templateType: emailsTable.templateType,
        tone: emailsTable.tone,
        status: emailsTable.status,
        sentAt: emailsTable.sentAt,
        createdAt: emailsTable.createdAt,
        updatedAt: emailsTable.updatedAt,
        company: {
          id: companiesTable.id,
          name: companiesTable.name,
          email: companiesTable.email,
          industry: companiesTable.industry,
          sector: companiesTable.sector,
          city: companiesTable.city,
          website: companiesTable.website,
          linkedin: companiesTable.linkedin,
          contactPerson: companiesTable.contactPerson,
          employees: companiesTable.employees,
          openPositions: companiesTable.openPositions,
          hiringNow: companiesTable.hiringNow,
          recruitmentIntensity: companiesTable.recruitmentIntensity,
          potentialClient: companiesTable.potentialClient,
          priority: companiesTable.priority,
          status: companiesTable.status,
          aiRecommendation: companiesTable.aiRecommendation,
          aiSummary: companiesTable.aiSummary,
          aiLeadScore: companiesTable.aiLeadScore,
          aiPriorityScore: companiesTable.aiPriorityScore,
          aiHiringProbability: companiesTable.aiHiringProbability,
          aiEmailTone: companiesTable.aiEmailTone,
          aiNextAction: companiesTable.aiNextAction,
          aiAnalyzedAt: companiesTable.aiAnalyzedAt,
          createdAt: companiesTable.createdAt,
          updatedAt: companiesTable.updatedAt,
        },
      })
      .from(emailsTable)
      .leftJoin(companiesTable, eq(emailsTable.companyId, companiesTable.id))
      .where(where)
      .orderBy(sql`${emailsTable.createdAt} desc`)
      .limit(limit)
      .offset(offset);

    res.json(emails);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list emails" });
  }
});

// POST /emails
router.post("/", async (req, res) => {
  try {
    const parsed = CreateEmailBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [email] = await db.insert(emailsTable).values(parsed.data).returning();
    res.status(201).json(email);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create email" });
  }
});

// GET /emails/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [email] = await db
      .select()
      .from(emailsTable)
      .where(eq(emailsTable.id, id))
      .limit(1);
    if (!email) { res.status(404).json({ error: "Email not found" }); return; }
    res.json(email);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get email" });
  }
});

// PATCH /emails/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateEmailBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [email] = await db
      .update(emailsTable)
      .set(parsed.data)
      .where(eq(emailsTable.id, id))
      .returning();
    if (!email) { res.status(404).json({ error: "Email not found" }); return; }
    res.json(email);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update email" });
  }
});

// DELETE /emails/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(emailsTable).where(eq(emailsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete email" });
  }
});

/** Shared helper: fetch email+company and Gmail connection, decrypt tokens, build auth client. */
async function resolveGmailContext(emailId: number, userId: string) {
  const [row] = await db
    .select({
      email: emailsTable,
      companyEmail: companiesTable.email,
      companyName: companiesTable.name,
    })
    .from(emailsTable)
    .leftJoin(companiesTable, eq(emailsTable.companyId, companiesTable.id))
    .where(eq(emailsTable.id, emailId))
    .limit(1);

  if (!row) return { error: "Email not found", status: 404 } as const;
  if (!row.companyEmail) return { error: "Recipient company has no email address on file", status: 422 } as const;

  const [connection] = await db
    .select()
    .from(gmailConnectionsTable)
    .where(eq(gmailConnectionsTable.userId, userId))
    .limit(1);

  if (!connection) return { error: "Gmail not connected", code: "GMAIL_NOT_CONNECTED", status: 422 } as const;

  // Decrypt tokens for use (they are stored encrypted at rest)
  const decryptedAccess = decrypt(connection.accessToken);
  const decryptedRefresh = connection.refreshToken ? decrypt(connection.refreshToken) : null;

  const auth = createOAuthClient({
    accessToken: decryptedAccess,
    refreshToken: decryptedRefresh,
    tokenExpiry: connection.tokenExpiry,
  });

  // Persist refreshed tokens (encrypted) if Google auto-refreshes them
  auth.on("tokens", async (tokens) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (tokens.access_token) updates.accessToken = encrypt(tokens.access_token);
    if (tokens.expiry_date) updates.tokenExpiry = new Date(tokens.expiry_date);
    if (tokens.refresh_token) updates.refreshToken = encrypt(tokens.refresh_token);
    await db
      .update(gmailConnectionsTable)
      .set(updates)
      .where(eq(gmailConnectionsTable.userId, userId));
  });

  return { row, connection, auth, senderEmail: connection.email } as const;
}

// POST /emails/:id/send — sends via real Gmail API
router.post("/:id/send", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const ctx = await resolveGmailContext(id, userId);
    if ("error" in ctx) {
      res.status(ctx.status ?? 500).json({ error: ctx.error, ...("code" in ctx ? { code: ctx.code } : {}) });
      return;
    }

    const { row, auth, senderEmail } = ctx;

    // Send via Gmail API — only update DB on success
    const gmailMessage = await sendGmailEmail(auth, {
      from: senderEmail,
      to: row.companyEmail!,
      subject: row.email.subject,
      body: row.email.body,
      signature: row.email.signature,
    });

    if (!gmailMessage.id) {
      throw new Error("Gmail API did not return a message ID");
    }

    const [updatedEmail] = await db
      .update(emailsTable)
      .set({ status: "sent", sentAt: new Date(), gmailMessageId: gmailMessage.id })
      .where(eq(emailsTable.id, id))
      .returning();

    if (updatedEmail.campaignId) {
      await db
        .update(campaignsTable)
        .set({
          emailsSent: sql`${campaignsTable.emailsSent} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaignsTable.id, updatedEmail.campaignId));
    }

    await db.insert(activitiesTable).values({
      type: "email_sent",
      description: `Email "${updatedEmail.subject}" sent to ${row.companyName ?? row.companyEmail} via Gmail`,
      entityId: updatedEmail.id,
      entityType: "email",
    });

    res.json(updatedEmail);
  } catch (err: any) {
    req.log.error(err);
    const gmailMessage = err?.response?.data?.error?.message ?? err?.message ?? "Failed to send email";
    res.status(500).json({ error: gmailMessage });
  }
});

// POST /emails/:id/draft — creates a Gmail draft (does NOT mark email as sent)
router.post("/:id/draft", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const ctx = await resolveGmailContext(id, userId);
    if ("error" in ctx) {
      res.status(ctx.status ?? 500).json({ error: ctx.error, ...("code" in ctx ? { code: ctx.code } : {}) });
      return;
    }

    const { row, auth, senderEmail } = ctx;

    const draft = await createGmailDraft(auth, {
      from: senderEmail,
      to: row.companyEmail!,
      subject: row.email.subject,
      body: row.email.body,
      signature: row.email.signature,
    });

    await db.insert(activitiesTable).values({
      type: "email_drafted",
      description: `Gmail draft created for "${row.email.subject}" → ${row.companyName ?? row.companyEmail}`,
      entityId: row.email.id,
      entityType: "email",
    });

    res.json({ draftId: draft.id, message: "Draft created in Gmail" });
  } catch (err: any) {
    req.log.error(err);
    const gmailMessage = err?.response?.data?.error?.message ?? err?.message ?? "Failed to create draft";
    res.status(500).json({ error: gmailMessage });
  }
});

export default router;
