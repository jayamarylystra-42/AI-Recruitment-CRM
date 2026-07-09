import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateCampaignBody,
  UpdateCampaignBody,
  UpdateCampaignStatusBody,
} from "@workspace/api-zod";

const router = Router();

// GET /campaigns
router.get("/", async (req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable).orderBy(campaignsTable.createdAt);
    res.json(campaigns);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

// POST /campaigns
router.post("/", async (req, res) => {
  try {
    const parsed = CreateCampaignBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [campaign] = await db.insert(campaignsTable).values(parsed.data).returning();
    await db.insert(activitiesTable).values({
      type: "campaign_created",
      description: `Campaign "${campaign.name}" was created`,
      entityId: campaign.id,
      entityType: "campaign",
    });
    res.status(201).json(campaign);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// GET /campaigns/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id)).limit(1);
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json(campaign);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get campaign" });
  }
});

// PATCH /campaigns/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateCampaignBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [campaign] = await db
      .update(campaignsTable)
      .set(parsed.data)
      .where(eq(campaignsTable.id, id))
      .returning();
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json(campaign);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// DELETE /campaigns/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [campaign] = await db.delete(campaignsTable).where(eq(campaignsTable.id, id)).returning();
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    await db.insert(activitiesTable).values({
      type: "campaign_deleted",
      description: `Campaign "${campaign.name}" was deleted`,
      entityType: "campaign",
    });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// PATCH /campaigns/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateCampaignStatusBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const updateData: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === "active") {
      updateData.startedAt = new Date();
    }

    const [campaign] = await db
      .update(campaignsTable)
      .set(updateData)
      .where(eq(campaignsTable.id, id))
      .returning();
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

    await db.insert(activitiesTable).values({
      type: "campaign_status_changed",
      description: `Campaign "${campaign.name}" status changed to ${parsed.data.status}`,
      entityId: campaign.id,
      entityType: "campaign",
    });

    res.json(campaign);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update campaign status" });
  }
});

export default router;
