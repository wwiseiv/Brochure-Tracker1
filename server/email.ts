import { Resend } from "resend";

// Resend connection settings cache (not the client - client is always fresh)
let connectionSettings: any;

export async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    // Fallback to environment variable if Replit connector not available
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      return { 
        apiKey, 
        fromEmail: process.env.RESEND_FROM_EMAIL || "PCBancard Sales Intelligence Suite <onboarding@resend.dev>" 
      };
    }
    throw new Error('Resend not configured - no connector or RESEND_API_KEY found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    // Fallback to environment variable
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      return { 
        apiKey, 
        fromEmail: process.env.RESEND_FROM_EMAIL || "PCBancard Sales Intelligence Suite <onboarding@resend.dev>" 
      };
    }
    throw new Error('Resend not connected');
  }
  return { 
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email || process.env.RESEND_FROM_EMAIL || "PCBancard Sales Intelligence Suite <onboarding@resend.dev>" 
  };
}

// WARNING: Never cache this client - tokens expire
async function getUncachableResendClient(): Promise<{ client: Resend; fromEmail: string } | null> {
  try {
    const { apiKey, fromEmail } = await getCredentials();
    return {
      client: new Resend(apiKey),
      fromEmail
    };
  } catch (error) {
    console.error("Failed to get Resend client:", error);
    return null;
  }
}

const FEEDBACK_RECIPIENT = "wwiseiv@icloud.com";
const ADDITIONAL_RECIPIENT = "wwise@pcbancard.com";
const APP_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : process.env.APP_URL || "https://brochuretracker.com";

interface SendInvitationParams {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
}

export async function sendInvitationEmail(params: SendInvitationParams): Promise<boolean> {
  try {
    console.log(`Sending invitation email to ${params.to} for org ${params.organizationName}`);
    const resendClient = await getUncachableResendClient();
    
    if (!resendClient) {
      console.error("Cannot send invitation email - Resend client not configured");
      return false;
    }
    
    const { client, fromEmail } = resendClient;
    
    const roleLabel = params.role === "master_admin" 
      ? "Admin" 
      : params.role === "relationship_manager" 
        ? "Relationship Manager" 
        : "Agent";

    const { error } = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject: `You're invited to join ${params.organizationName} on PCBancard Sales Intelligence Suite`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PCBancard Sales Intelligence Suite</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You're Invited!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              Hi there,
            </p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> as a <strong>${roleLabel}</strong> on PCBancard Sales Intelligence Suite.
            </p>
            
            <p style="font-size: 16px; margin: 0 0 25px 0;">
              PCBancard Sales Intelligence Suite is a mobile app for tracking video brochure deployments. As a team member, you'll be able to log drops, track pickups, and manage your sales activities.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.inviteLink}" style="background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin: 25px 0 0 0; text-align: center;">
              This invitation expires in ${params.expiresIn}.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      console.error("Email error details:", JSON.stringify(error, null, 2));
      return false;
    }

    console.log(`Invitation email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error("Error sending invitation email:", error?.message || error);
    console.error("Full error:", JSON.stringify(error, null, 2));
    return false;
  }
}

interface SendFeedbackParams {
  userName: string;
  userEmail: string;
  type: string;
  subject: string;
  message: string;
}

export async function sendFeedbackEmail(params: SendFeedbackParams): Promise<boolean> {
  try {
    const resendClient = await getUncachableResendClient();
    
    if (!resendClient) {
      console.error("Cannot send feedback email - Resend client not configured");
      return false;
    }
    
    const { client, fromEmail } = resendClient;
    
    const typeLabel = params.type === "feature_suggestion" 
      ? "Feature Suggestion" 
      : params.type === "help_request" 
        ? "Help Request" 
        : "Bug Report";

    const { error } = await client.emails.send({
      from: fromEmail,
      to: FEEDBACK_RECIPIENT,
      subject: `[PCBancard SIS ${typeLabel}] ${params.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1E40AF; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">New ${typeLabel}</h2>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; width: 100px;">From:</td>
                <td style="padding: 8px 0;">${params.userName || "Anonymous"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0;">${params.userEmail || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Type:</td>
                <td style="padding: 8px 0;">${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600;">Subject:</td>
                <td style="padding: 8px 0;">${params.subject}</td>
              </tr>
            </table>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            
            <h3 style="margin: 0 0 10px 0;">Message:</h3>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap;">
${params.message}
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send feedback email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending feedback email:", error);
    return false;
  }
}

export function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

interface SendThankYouEmailParams {
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  senderName: string;
}

export async function sendThankYouEmail(params: SendThankYouEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Sending thank you email to ${params.to}`);
    const resendClient = await getUncachableResendClient();
    
    if (!resendClient) {
      console.error("Cannot send thank you email - Resend client not configured");
      return { success: false, error: "Email service not configured" };
    }

    const { client, fromEmail } = resendClient;

    // Convert newlines to HTML breaks for proper formatting
    const formattedBody = params.body.replace(/\n/g, "<br>");

    const { error } = await client.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Thank You!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">We appreciate your support</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              Dear ${params.recipientName},
            </p>
            
            <div style="font-size: 16px; margin: 0 0 20px 0;">
              ${formattedBody}
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            
            <p style="font-size: 14px; color: #64748b; margin: 0;">
              Best regards,<br>
              <strong>${params.senderName}</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send thank you email:", error);
      const errorMessage = error.message || "Failed to send email";
      return { success: false, error: errorMessage };
    }

    console.log(`Thank you email sent successfully to ${params.to}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending thank you email:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}

interface SendNewMemberNotificationParams {
  adminEmail: string;
  memberName: string;
  memberEmail: string;
  organizationName: string;
  role: string;
  joinedVia: "invitation" | "self_signup";
}

export async function sendNewMemberNotification(params: SendNewMemberNotificationParams): Promise<boolean> {
  try {
    const resendClient = await getUncachableResendClient();
    
    if (!resendClient) {
      console.error("Cannot send new member notification - Resend client not configured");
      return false;
    }
    
    const { client, fromEmail } = resendClient;
    
    const roleLabel = params.role === "master_admin" 
      ? "Admin" 
      : params.role === "relationship_manager" 
        ? "Relationship Manager" 
        : "Agent";

    const joinedViaLabel = params.joinedVia === "invitation" 
      ? "accepted an invitation" 
      : "signed up directly";

    const { error } = await client.emails.send({
      from: fromEmail,
      to: params.adminEmail,
      subject: `New team member joined ${params.organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Team Member!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${params.organizationName}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              Great news! A new team member has joined your organization.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; width: 100px;">Name:</td>
                  <td style="padding: 8px 0;">${params.memberName || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0;">${params.memberEmail || "Not provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Role:</td>
                  <td style="padding: 8px 0;">${roleLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Joined via:</td>
                  <td style="padding: 8px 0;">${joinedViaLabel}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin: 20px 0 0 0;">
              You can manage team members and their roles from the Team Management page in PCBancard Sales Intelligence Suite.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
              This is an automated notification from PCBancard Sales Intelligence Suite.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send new member notification:", error);
      return false;
    }

    console.log(`New member notification sent to ${params.adminEmail}`);
    return true;
  } catch (error: any) {
    console.error("Error sending new member notification:", error?.message || error);
    return false;
  }
}

const MEETING_RECORDING_RECIPIENTS = ["wwiseiv@icloud.com", "wwise@pcbancard.com"];

interface SendMeetingRecordingParams {
  agentName: string;
  agentEmail: string;
  businessName: string;
  contactName?: string;
  businessPhone?: string;
  recordingUrl: string;
  recordingId: number;
  durationFormatted: string;
  aiSummary?: string;
  keyTakeaways?: string[];
  sentiment?: string;
  recordedAt: Date;
}

export async function sendMeetingRecordingEmail(params: SendMeetingRecordingParams): Promise<boolean> {
  try {
    console.log(`Sending meeting recording email for ${params.businessName}`);
    const resendClient = await getUncachableResendClient();
    
    if (!resendClient) {
      console.error("Cannot send meeting recording email - Resend client not configured");
      return false;
    }
    
    const { client, fromEmail } = resendClient;

    const takeawaysHtml = params.keyTakeaways && params.keyTakeaways.length > 0
      ? `
        <div style="margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1E40AF;">Key Takeaways</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${params.keyTakeaways.map(t => `<li style="margin: 5px 0;">${t}</li>`).join("")}
          </ul>
        </div>
      `
      : "";

    const sentimentColor = params.sentiment === "positive" ? "#059669" 
      : params.sentiment === "negative" ? "#DC2626" 
      : "#6B7280";

    const sentimentLabel = params.sentiment 
      ? params.sentiment.charAt(0).toUpperCase() + params.sentiment.slice(1)
      : "Not analyzed";

    const recordedDate = new Date(params.recordedAt);
    const dateFormatted = recordedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const { error } = await client.emails.send({
      from: fromEmail,
      to: MEETING_RECORDING_RECIPIENTS,
      subject: `New Sales Meeting Recording: ${params.businessName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Meeting Recording</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sales Coaching Repository</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 0 0 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #1E40AF;">Merchant Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; width: 120px;">Business:</td>
                  <td style="padding: 8px 0;">${params.businessName}</td>
                </tr>
                ${params.contactName ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Contact:</td>
                  <td style="padding: 8px 0;">${params.contactName}</td>
                </tr>
                ` : ""}
                ${params.businessPhone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Phone:</td>
                  <td style="padding: 8px 0;">${params.businessPhone}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Agent:</td>
                  <td style="padding: 8px 0;">${params.agentName} (${params.agentEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Recorded:</td>
                  <td style="padding: 8px 0;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Duration:</td>
                  <td style="padding: 8px 0;">${params.durationFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Sentiment:</td>
                  <td style="padding: 8px 0;"><span style="color: ${sentimentColor}; font-weight: 600;">${sentimentLabel}</span></td>
                </tr>
              </table>
            </div>
            
            ${params.aiSummary ? `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 0 0 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1E40AF;">AI Summary</h3>
              <p style="margin: 0; color: #4B5563;">${params.aiSummary}</p>
            </div>
            ` : ""}
            
            ${takeawaysHtml}
            
            <div style="text-align: center; margin: 30px 0 20px 0;">
              <a href="${params.recordingUrl}" style="background: #7C3AED; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; margin-right: 10px;">
                Listen to Recording
              </a>
              <a href="${APP_URL}/api/meeting-recordings/${params.recordingId}/download" style="background: #1E40AF; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; margin-top: 10px;">
                Download Recording
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
              This recording has been added to the sales coaching repository for AI analysis and training purposes.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send meeting recording email:", error);
      return false;
    }

    console.log(`Meeting recording email sent to ${MEETING_RECORDING_RECIPIENTS.join(", ")}`);
    return true;
  } catch (error: any) {
    console.error("Error sending meeting recording email:", error?.message || error);
    return false;
  }
}

interface SendRoleplaySessionEmailParams {
  agentName: string;
  agentEmail: string;
  scenario: string;
  mode: string;
  performanceScore: number;
  feedback: {
    overallScore?: number;
    strengths?: string[];
    areasToImprove?: string[];
    nepqUsage?: string;
    objectionHandling?: string;
    rapportBuilding?: string;
    topTip?: string;
  };
  conversationSummary: string;
  sessionId: number;
  completedAt: Date;
}

export async function sendRoleplaySessionEmail(params: SendRoleplaySessionEmailParams): Promise<boolean> {
  try {
    console.log(`Sending roleplay session email for session ${params.sessionId}`);
    const resendClient = await getUncachableResendClient();
    
    if (!resendClient) {
      console.error("Cannot send roleplay session email - Resend client not configured");
      return false;
    }
    
    const { client, fromEmail } = resendClient;

    const strengthsHtml = params.feedback.strengths && params.feedback.strengths.length > 0
      ? `
        <div style="margin: 15px 0;">
          <h4 style="margin: 0 0 8px 0; color: #059669;">Strengths</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${params.feedback.strengths.map(s => `<li style="margin: 4px 0; color: #4B5563;">${s}</li>`).join("")}
          </ul>
        </div>
      `
      : "";

    const improvementsHtml = params.feedback.areasToImprove && params.feedback.areasToImprove.length > 0
      ? `
        <div style="margin: 15px 0;">
          <h4 style="margin: 0 0 8px 0; color: #DC2626;">Areas to Improve</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${params.feedback.areasToImprove.map(a => `<li style="margin: 4px 0; color: #4B5563;">${a}</li>`).join("")}
          </ul>
        </div>
      `
      : "";

    const scoreColor = params.performanceScore >= 80 ? "#059669" 
      : params.performanceScore >= 60 ? "#D97706" 
      : "#DC2626";

    const modeLabel = params.mode === "coaching" ? "Coaching Session" : "Role-Play Practice";
    const scenarioLabel = params.scenario.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    const completedDate = new Date(params.completedAt);
    const dateFormatted = completedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const { error } = await client.emails.send({
      from: fromEmail,
      to: MEETING_RECORDING_RECIPIENTS,
      subject: `AI Coach Session: ${params.agentName} - ${scenarioLabel} (Score: ${params.performanceScore})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AI Coach Session Complete</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${modeLabel}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; width: 120px;">Agent:</td>
                  <td style="padding: 8px 0;">${params.agentName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0;">${params.agentEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Scenario:</td>
                  <td style="padding: 8px 0;">${scenarioLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Completed:</td>
                  <td style="padding: 8px 0;">${dateFormatted}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="display: inline-block; background: ${scoreColor}; color: white; padding: 20px 40px; border-radius: 12px;">
                <div style="font-size: 14px; opacity: 0.9;">Performance Score</div>
                <div style="font-size: 48px; font-weight: bold;">${params.performanceScore}</div>
              </div>
            </div>
            
            ${strengthsHtml}
            ${improvementsHtml}
            
            ${params.feedback.nepqUsage ? `
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
              <h4 style="margin: 0 0 8px 0; color: #1E40AF;">NEPQ Usage</h4>
              <p style="margin: 0; color: #4B5563;">${params.feedback.nepqUsage}</p>
            </div>
            ` : ""}
            
            ${params.feedback.objectionHandling ? `
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
              <h4 style="margin: 0 0 8px 0; color: #1E40AF;">Objection Handling</h4>
              <p style="margin: 0; color: #4B5563;">${params.feedback.objectionHandling}</p>
            </div>
            ` : ""}
            
            ${params.feedback.rapportBuilding ? `
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
              <h4 style="margin: 0 0 8px 0; color: #1E40AF;">Rapport Building</h4>
              <p style="margin: 0; color: #4B5563;">${params.feedback.rapportBuilding}</p>
            </div>
            ` : ""}
            
            ${params.feedback.topTip ? `
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 15px; border-radius: 8px; border: 1px solid #F59E0B; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #92400E;">Top Tip</h4>
              <p style="margin: 0; color: #78350F; font-weight: 500;">${params.feedback.topTip}</p>
            </div>
            ` : ""}
            
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #1E40AF;">Conversation Summary</h4>
              <p style="margin: 0; color: #4B5563; white-space: pre-wrap; font-size: 14px;">${params.conversationSummary}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
              This coaching session has been logged for team training analytics.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send roleplay session email:", error);
      return false;
    }

    console.log(`Roleplay session email sent to ${MEETING_RECORDING_RECIPIENTS.join(", ")}`);
    return true;
  } catch (error: any) {
    console.error("Error sending roleplay session email:", error?.message || error);
    return false;
  }
}
