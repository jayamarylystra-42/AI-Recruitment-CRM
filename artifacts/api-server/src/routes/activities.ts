import { Router } from "express";
import { db } from "@workspace/db";
import { activitiesTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { ListActivitiesQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /activities
router.get("/", async (req, res) => {
  try {
    const query = ListActivitiesQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};
    const limit = Number(params.limit ?? 20);

    const activities = await db
      .select()
      .from(activitiesTable)
      .orderBy(desc(activitiesTable.createdAt))
      .limit(limit);

    res.json(activities);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list activities" });
  }
});

export default router;
