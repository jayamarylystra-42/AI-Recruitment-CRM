import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GenerateEmailBody, AiChatBody } from "@workspace/api-zod";
import { generateJSON, generateText } from "../lib/gemini";

const router = Router();

// POST /ai/analyze-company/:id
router.post("/analyze-company/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }

    const prompt = `You are an expert business analyst and recruitment intelligence specialist. Analyze this company and provide a structured assessment.

Company Information:
- Name: ${company.name}
- Industry: ${company.industry ?? "Unknown"}
- Sector: ${company.sector ?? "Unknown"}
- Website: ${company.website ?? "Not provided"}
- LinkedIn: ${company.linkedin ?? "Not provided"}
- City: ${company.city ?? "Unknown"}
- Employees: ${company.employees ?? "Unknown"}
- Open Positions: ${company.openPositions ?? 0}
- Hiring Now: ${company.hiringNow ? "Yes" : "No"}
- Recruitment Intensity: ${company.recruitmentIntensity ?? "Unknown"}
- Potential Client: ${company.potentialClient ? "Yes" : "No"}

Provide a JSON response with these exact fields:
{
  "companySummary": "2-3 sentence professional summary of the company",
  "recruitmentStatus": "Current recruitment activity assessment",
  "industry": "Refined industry classification",
  "businessType": "B2B/B2C/B2G or mixed",
  "priorityScore": <integer 0-100>,
  "leadScore": <integer 0-100>,
  "hiringProbability": <integer 0-100>,
  "outreachRecommendation": "Specific recommendation for outreach approach",
  "salesRecommendation": "Specific sales strategy recommendation",
  "emailTone": "Professional/Friendly/Formal/Executive",
  "nextAction": "The single most important next action to take"
}

Be specific and actionable. Base scores on the company data provided.`;

    const analysis = await generateJSON<{
      companySummary: string;
      recruitmentStatus: string;
      industry: string;
      businessType: string;
      priorityScore: number;
      leadScore: number;
      hiringProbability: number;
      outreachRecommendation: string;
      salesRecommendation: string;
      emailTone: string;
      nextAction: string;
    }>(prompt);

    await db.update(companiesTable).set({
      aiSummary: analysis.companySummary,
      aiLeadScore: Math.min(100, Math.max(0, analysis.leadScore)),
      aiPriorityScore: Math.min(100, Math.max(0, analysis.priorityScore)),
      aiHiringProbability: Math.min(100, Math.max(0, analysis.hiringProbability)),
      aiEmailTone: analysis.emailTone,
      aiNextAction: analysis.nextAction,
      aiRecommendation: analysis.outreachRecommendation,
      aiAnalyzedAt: new Date(),
      ...(analysis.industry ? { industry: analysis.industry } : {}),
    }).where(eq(companiesTable.id, id));

    await db.insert(activitiesTable).values({
      type: "ai_analysis",
      description: `AI analyzed company "${company.name}" — Lead Score: ${analysis.leadScore}`,
      entityId: id,
      entityType: "company",
    });

    res.json(analysis);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to analyze company" });
  }
});

// POST /ai/generate-email
router.post("/generate-email", async (req, res) => {
  try {
    const parsed = GenerateEmailBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const { companyId, templateType, tone, additionalContext } = parsed.data;

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }

    const prompt = `You are an expert business development and recruitment outreach specialist. Write a compelling ${templateType} email to ${company.name}.

Company Details:
- Name: ${company.name}
- Industry: ${company.industry ?? "Technology"}
- City: ${company.city ?? ""}
- Contact Person: ${company.contactPerson ?? "Hiring Manager"}
- AI Summary: ${company.aiSummary ?? "Growing company"}
- AI Recommendation: ${company.aiRecommendation ?? ""}
- Hiring Status: ${company.hiringNow ? "Currently hiring" : "Not actively hiring"}

Template Type: ${templateType}
Tone: ${tone}
${additionalContext ? `Additional Context: ${additionalContext}` : ""}

Write a highly personalized, professional email. Return JSON with:
{
  "subject": "Compelling email subject line",
  "body": "Full email body with proper paragraphs. Use \\n for line breaks. Be specific to this company.",
  "signature": "Professional email signature (name, title, company)"
}

The email should be personalized, have a clear value proposition, a specific call to action, be concise (150-250 words), match the ${tone} tone, and NOT use generic placeholders.`;

    const email = await generateJSON<{ subject: string; body: string; signature: string }>(prompt);

    res.json(email);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate email" });
  }
});

// POST /ai/chat
router.post("/chat", async (req, res) => {
  try {
    const parsed = AiChatBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const { message, context } = parsed.data;

    const systemContext = `You are an AI assistant for an AI-Powered Client Acquisition & Recruitment Outreach System. You help users with analyzing companies, crafting outreach strategies, interpreting recruitment data, and providing actionable recommendations.
${context ? `\nCurrent context: ${context}` : ""}

Be concise, professional, and actionable.`;

    const fullPrompt = `${systemContext}\n\nUser: ${message}\n\nAssistant:`;
    const response = await generateText(fullPrompt);

    res.json({ response });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

export default router;
