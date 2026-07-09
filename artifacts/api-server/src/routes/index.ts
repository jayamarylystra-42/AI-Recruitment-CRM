import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companiesRouter from "./companies";
import campaignsRouter from "./campaigns";
import emailsRouter from "./emails";
import aiRouter from "./ai";
import analyticsRouter from "./analytics";
import activitiesRouter from "./activities";
import { gmailRouter, gmailCallbackRouter } from "./gmail";
import oauthDiagnosticsRouter from "./oauth-diagnostics";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);

// Gmail OAuth callback must be public — Google redirects here without auth headers
router.use("/gmail/callback", gmailCallbackRouter);

// OAuth diagnostics — public, read-only, no secrets exposed
router.use("/oauth-test", oauthDiagnosticsRouter);

// All other routes require authentication
router.use(requireAuth);
router.use("/companies", companiesRouter);
router.use("/campaigns", campaignsRouter);
router.use("/emails", emailsRouter);
router.use("/ai", aiRouter);
router.use("/analytics", analyticsRouter);
router.use("/activities", activitiesRouter);
router.use("/gmail", gmailRouter);

export default router;
