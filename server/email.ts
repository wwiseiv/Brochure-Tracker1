import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM_EMAIL = "BrochureDrop <onboarding@resend.dev>";
const FEEDBACK_RECIPIENT = "wwiseiv@icloud.com";

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
    const client = getResendClient();
    
    const roleLabel = params.role === "master_admin" 
      ? "Admin" 
      : params.role === "relationship_manager" 
        ? "Relationship Manager" 
        : "Agent";

    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `You're invited to join ${params.organizationName} on BrochureDrop`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">BrochureDrop</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You're Invited!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              Hi there,
            </p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> as a <strong>${roleLabel}</strong> on BrochureDrop.
            </p>
            
            <p style="font-size: 16px; margin: 0 0 25px 0;">
              BrochureDrop is a mobile app for tracking video brochure deployments. As a team member, you'll be able to log drops, track pickups, and manage your sales activities.
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
    const client = getResendClient();
    
    const typeLabel = params.type === "feature_suggestion" 
      ? "Feature Suggestion" 
      : params.type === "help_request" 
        ? "Help Request" 
        : "Bug Report";

    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: FEEDBACK_RECIPIENT,
      subject: `[BrochureDrop ${typeLabel}] ${params.subject}`,
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
