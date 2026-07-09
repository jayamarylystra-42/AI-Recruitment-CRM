import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, activitiesTable } from "@workspace/db";
import { eq, ilike, and, or, sql, inArray } from "drizzle-orm";
import {
  CreateCompanyBody,
  UpdateCompanyBody,
  ListCompaniesQueryParams,
  BulkDeleteCompaniesBody,
  ImportCompaniesBody,
} from "@workspace/api-zod";

const router = Router();

// GET /companies
router.get("/", async (req, res) => {
  try {
    const query = ListCompaniesQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};

    const conditions = [];

    if (params.search) {
      conditions.push(
        or(
          ilike(companiesTable.name, `%${params.search}%`),
          ilike(companiesTable.email, `%${params.search}%`),
          ilike(companiesTable.industry, `%${params.search}%`),
          ilike(companiesTable.sector, `%${params.search}%`),
          ilike(companiesTable.city, `%${params.search}%`),
        ),
      );
    }
    if (params.sector) conditions.push(eq(companiesTable.sector, params.sector));
    if (params.priority) conditions.push(eq(companiesTable.priority, params.priority));
    if (params.status) conditions.push(eq(companiesTable.status, params.status));
    if (params.hiringNow === "true") conditions.push(eq(companiesTable.hiringNow, true));
    if (params.hiringNow === "false") conditions.push(eq(companiesTable.hiringNow, false));
    if (params.potentialClient === "true") conditions.push(eq(companiesTable.potentialClient, true));
    if (params.potentialClient === "false") conditions.push(eq(companiesTable.potentialClient, false));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = Number(params.limit ?? 50);
    const offset = Number(params.offset ?? 0);

    const [companies, countResult] = await Promise.all([
      db
        .select()
        .from(companiesTable)
        .where(where)
        .orderBy(sql`${companiesTable.createdAt} desc`)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(companiesTable).where(where),
    ]);

    res.json({ companies, total: countResult[0]?.count ?? 0, limit, offset });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list companies" });
  }
});

// POST /companies
router.post("/", async (req, res) => {
  try {
    const parsed = CreateCompanyBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [company] = await db.insert(companiesTable).values(parsed.data).returning();
    await db.insert(activitiesTable).values({
      type: "company_created",
      description: `Company "${company.name}" was added`,
      entityId: company.id,
      entityType: "company",
    });
    res.status(201).json(company);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create company" });
  }
});

// POST /companies/bulk-delete
router.post("/bulk-delete", async (req, res) => {
  try {
    const parsed = BulkDeleteCompaniesBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const { ids } = parsed.data;
    if (ids.length === 0) { res.json({ deleted: 0 }); return; }

    const result = await db.delete(companiesTable).where(inArray(companiesTable.id, ids)).returning();
    await db.insert(activitiesTable).values({
      type: "companies_deleted",
      description: `${result.length} companies were deleted`,
      entityType: "company",
    });
    res.json({ deleted: result.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to bulk delete" });
  }
});

// POST /companies/import
router.post("/import", async (req, res) => {
  try {
    const parsed = ImportCompaniesBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of parsed.data.rows) {
      try {
        if (!row.name) { skipped++; continue; }
        const existing = await db.select().from(companiesTable).where(
          row.email ? eq(companiesTable.email, row.email) : eq(companiesTable.name, row.name)
        ).limit(1);
        if (existing.length > 0) { skipped++; continue; }
        await db.insert(companiesTable).values({
          name: row.name,
          industry: row.industry ?? null,
          email: row.email ?? null,
          website: row.website ?? null,
          linkedin: row.linkedin ?? null,
          employees: row.employees ?? null,
          hiringNow: row.hiringNow ?? null,
          recruitmentIntensity: row.recruitmentIntensity ?? null,
          potentialClient: row.potentialClient ?? null,
        });
        imported++;
      } catch {
        errors++;
      }
    }

    await db.insert(activitiesTable).values({
      type: "companies_imported",
      description: `Imported ${imported} companies (${skipped} skipped, ${errors} errors)`,
      entityType: "company",
    });

    res.json({ imported, skipped, errors });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to import companies" });
  }
});

// GET /companies/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    res.json(company);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get company" });
  }
});

// PATCH /companies/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateCompanyBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [company] = await db
      .update(companiesTable)
      .set(parsed.data)
      .where(eq(companiesTable.id, id))
      .returning();

    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    res.json(company);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update company" });
  }
});

// DELETE /companies/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [company] = await db.delete(companiesTable).where(eq(companiesTable.id, id)).returning();
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    await db.insert(activitiesTable).values({
      type: "company_deleted",
      description: `Company "${company.name}" was deleted`,
      entityType: "company",
    });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete company" });
  }
});

export default router;
