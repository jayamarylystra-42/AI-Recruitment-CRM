import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/**
 * Middleware that enforces Clerk authentication on API routes.
 * Returns 401 if the request is not authenticated.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
