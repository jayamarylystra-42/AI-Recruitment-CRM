import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, campaignsTable, emailsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

// GET /analytics/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const [
      companiesResult,
      campaignsResult,
      emailsResult,
      hiringResult,
      highPriorityResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(companiesTable),
      db.select({ count: sql<number>`count(*)::int` }).from(campaignsTable),
      db.select({
        total: sql<number>`count(*)::int`,
        sent: sql<number>`count(*) filter (where status = 'sent')::int`,
        draft: sql<number>`count(*) filter (where status = 'draft')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      }).from(emailsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(companiesTable).where(eq(companiesTable.hiringNow, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(companiesTable).where(eq(companiesTable.priority, "high")),
    ]);

    const totalCompanies = companiesResult[0]?.count ?? 0;
    const totalCampaigns = campaignsResult[0]?.count ?? 0;
    const emailStats = emailsResult[0] ?? { total: 0, sent: 0, draft: 0, failed: 0 };
    const hiringCompanies = hiringResult[0]?.count ?? 0;
    const highPriorityCompanies = highPriorityResult[0]?.count ?? 0;

    // Calculate avg AI score from companies that have been analyzed
    const aiScoreResult = await db.select({
      avgScore: sql<number>`round(avg(ai_lead_score))::int`,
    }).from(companiesTable).where(sql`ai_lead_score is not null`);

    // Campaign averages
    const campaignAvgResult = await db.select({
      avgOpenRate: sql<number>`round(avg(open_rate)::numeric, 1)`,
      avgReplyRate: sql<number>`round(avg(reply_rate)::numeric, 1)`,
      totalReplies: sql<number>`sum(replies)::int`,
    }).from(campaignsTable);

    res.json({
      totalCompanies,
      totalCampaigns,
      totalEmailsSent: emailStats.sent,
      totalDrafts: emailStats.draft,
      totalReplies: campaignAvgResult[0]?.totalReplies ?? 0,
      pendingEmails: emailStats.draft,
      avgOpenRate: campaignAvgResult[0]?.avgOpenRate ?? 0,
      avgReplyRate: campaignAvgResult[0]?.avgReplyRate ?? 0,
      avgAiScore: aiScoreResult[0]?.avgScore ?? 0,
      hiringCompanies,
      highPriorityCompanies,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

// GET /analytics/companies-by-sector
router.get("/companies-by-sector", async (req, res) => {
  try {
    const result = await db
      .select({
        label: sql<string>`coalesce(sector, 'Unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(companiesTable)
      .groupBy(sql`coalesce(sector, 'Unknown')`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get sector data" });
  }
});

// GET /analytics/companies-by-priority
router.get("/companies-by-priority", async (req, res) => {
  try {
    const result = await db
      .select({
        label: sql<string>`coalesce(priority, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(companiesTable)
      .groupBy(sql`coalesce(priority, 'unknown')`)
      .orderBy(desc(sql`count(*)`));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get priority data" });
  }
});

// GET /analytics/email-status
router.get("/email-status", async (req, res) => {
  try {
    const result = await db
      .select({
        label: emailsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(emailsTable)
      .groupBy(emailsTable.status)
      .orderBy(desc(sql`count(*)`));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get email status data" });
  }
});

// GET /analytics/monthly-campaigns
router.get("/monthly-campaigns", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        to_char(created_at, 'Mon YYYY') as month,
        count(*)::int as count
      FROM campaigns
      WHERE created_at >= now() - interval '6 months'
      GROUP BY to_char(created_at, 'Mon YYYY'), date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at)
    `);

    res.json(result.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get monthly campaigns" });
  }
});

// GET /analytics/top-companies
router.get("/top-companies", async (req, res) => {
  try {
    const companies = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.priority, "high"))
      .orderBy(desc(companiesTable.aiLeadScore))
      .limit(10);

    res.json(companies);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get top companies" });
  }
});

// GET /analytics/recent-companies
router.get("/recent-companies", async (req, res) => {
  try {
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(desc(companiesTable.createdAt))
      .limit(10);

    res.json(companies);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get recent companies" });
  }
});

export default router;
