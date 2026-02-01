import { db } from "../db";
import { prospectSearches, statementAnalysisJobs, proposalParseJobs } from "@shared/schema";
import { eq, or, lt, and } from "drizzle-orm";

export async function recoverStuckProspectJobs(): Promise<void> {
  try {
    // Jobs that are stuck in pending or processing for more than 2 minutes are likely orphaned
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    const stuckJobs = await db
      .select()
      .from(prospectSearches)
      .where(
        or(
          // Pending jobs that never started
          and(
            eq(prospectSearches.status, "pending"),
            lt(prospectSearches.createdAt, twoMinutesAgo)
          ),
          // Processing jobs that started but never completed
          and(
            eq(prospectSearches.status, "processing"),
            lt(prospectSearches.startedAt, twoMinutesAgo)
          )
        )
      );

    if (stuckJobs.length > 0) {
      console.log(`[JobRecovery] Found ${stuckJobs.length} stuck prospect jobs, marking as failed for retry`);
      
      for (const job of stuckJobs) {
        await db
          .update(prospectSearches)
          .set({
            status: "failed",
            errorMessage: "Server restart - please retry search",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(prospectSearches.id, job.id));
        
        console.log(`[JobRecovery] Marked job ${job.id} as failed`);
      }
    } else {
      console.log("[JobRecovery] No stuck prospect jobs found");
    }

    const stuckAnalysisJobs = await db
      .select()
      .from(statementAnalysisJobs)
      .where(
        or(
          // Pending jobs that never started
          and(
            eq(statementAnalysisJobs.status, "pending"),
            lt(statementAnalysisJobs.createdAt, twoMinutesAgo)
          ),
          // Processing jobs that started but never completed
          and(
            eq(statementAnalysisJobs.status, "processing"),
            lt(statementAnalysisJobs.startedAt, twoMinutesAgo)
          )
        )
      );

    if (stuckAnalysisJobs.length > 0) {
      console.log(`[JobRecovery] Found ${stuckAnalysisJobs.length} stuck statement analysis jobs, marking as failed`);
      
      for (const job of stuckAnalysisJobs) {
        await db
          .update(statementAnalysisJobs)
          .set({
            status: "failed",
            errorMessage: "Server restart - please retry analysis",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(statementAnalysisJobs.id, job.id));
        
        console.log(`[JobRecovery] Marked statement analysis job ${job.id} as failed`);
      }
    }

    // Recover stuck proposal parse jobs
    const stuckParseJobs = await db
      .select()
      .from(proposalParseJobs)
      .where(
        or(
          and(
            eq(proposalParseJobs.status, "pending"),
            lt(proposalParseJobs.createdAt, twoMinutesAgo)
          ),
          and(
            eq(proposalParseJobs.status, "processing"),
            lt(proposalParseJobs.startedAt, twoMinutesAgo)
          )
        )
      );

    if (stuckParseJobs.length > 0) {
      console.log(`[JobRecovery] Found ${stuckParseJobs.length} stuck proposal parse jobs, marking as failed`);
      
      for (const job of stuckParseJobs) {
        await db
          .update(proposalParseJobs)
          .set({
            status: "failed",
            errorMessage: "Server restart - please retry parsing",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(proposalParseJobs.id, job.id));
        
        console.log(`[JobRecovery] Marked proposal parse job ${job.id} as failed`);
      }
    } else {
      console.log("[JobRecovery] No stuck proposal parse jobs found");
    }
  } catch (error) {
    console.error("[JobRecovery] Error recovering stuck jobs:", error);
  }
}
