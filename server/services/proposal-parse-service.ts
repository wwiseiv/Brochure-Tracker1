import { storage } from "../storage";
import { parseProposalFromStorage } from "../proposal-generator";
import webpush from "web-push";

export async function processProposalParseJob(jobId: number): Promise<void> {
  console.log("[ProposalParse] Starting job:", jobId);

  try {
    const job = await storage.getProposalParseJob(jobId);
    if (!job) {
      console.error("[ProposalParse] Job not found:", jobId);
      return;
    }

    await storage.updateProposalParseJob(jobId, {
      status: "processing",
      startedAt: new Date(),
      progressMessage: "Parsing proposal documents...",
    });

    console.log("[ProposalParse] Processing job:", jobId);

    const files = (job.filePaths || []).map((path, i) => ({
      path,
      mimeType: job.fileMimeTypes?.[i] || "application/pdf",
      name: job.fileNames?.[i] || `file-${i}.pdf`,
    }));

    if (files.length === 0) {
      throw new Error("No files to parse");
    }

    const parsedResult = await parseProposalFromStorage(files);

    const extractionWarnings: string[] = [];
    if (parsedResult.extractionWarnings) {
      extractionWarnings.push(...parsedResult.extractionWarnings);
    }

    await storage.updateProposalParseJob(jobId, {
      status: "completed",
      completedAt: new Date(),
      parsedData: parsedResult,
      extractionWarnings: extractionWarnings.length > 0 ? extractionWarnings : null,
      progress: 100,
      progressMessage: "Complete",
    });

    console.log("[ProposalParse] Job completed:", jobId);

    await sendPushNotification(job.agentId, jobId, "success", "Proposal parsing complete");

    await storage.updateProposalParseJob(jobId, {
      notificationSent: true,
      notificationSentAt: new Date(),
    });
  } catch (error: any) {
    console.error("[ProposalParse] Job failed:", jobId, error);

    await storage.updateProposalParseJob(jobId, {
      status: "failed",
      errorMessage: error.message || "Unknown error occurred",
      completedAt: new Date(),
    });

    const job = await storage.getProposalParseJob(jobId);
    if (job) {
      await sendPushNotification(job.agentId, jobId, "error", "Proposal parsing failed");
    }
  }
}

async function sendPushNotification(
  agentId: string,
  jobId: number,
  type: "success" | "error",
  message: string
): Promise<void> {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("[ProposalParse] VAPID keys not configured, skipping push notification");
    return;
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const subscriptions = await storage.getPushSubscriptionsByUser(agentId);

    const payload = JSON.stringify({
      title: type === "success" ? "Proposal Parse Complete" : "Proposal Parse Failed",
      body: message,
      data: { jobId, type: "proposal-parse-complete" },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keysP256dh,
              auth: sub.keysAuth,
            },
          },
          payload
        );
      } catch (pushErr: any) {
        console.error("[ProposalParse] Push notification failed:", pushErr.message);
      }
    }
  } catch (notifyErr: any) {
    console.error("[ProposalParse] Failed to send notifications:", notifyErr.message);
  }
}
