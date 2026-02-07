import { Resend } from 'resend';
import type { GeneratedDigest } from "./ai-generator";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PCBancard <noreply@pcbisv.com>";

  if (!xReplitToken || !hostname) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      return { apiKey, fromEmail: DEFAULT_FROM_EMAIL };
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
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      return { apiKey, fromEmail: DEFAULT_FROM_EMAIL };
    }
    throw new Error('Resend not connected');
  }
  return { 
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: DEFAULT_FROM_EMAIL
  };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendDigestEmail(
  toEmail: string,
  digest: GeneratedDigest,
  appUrl: string
): Promise<SendResult> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const html = generateEmailHtml(digest, appUrl);
    
    const result = await client.emails.send({
      from: fromEmail || 'PCBancard <noreply@resend.dev>',
      to: toEmail,
      subject: digest.subject,
      html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send digest email:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

function generateEmailHtml(digest: GeneratedDigest, appUrl: string): string {
  const sectionHtml = digest.sections.map(section => `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 12px 0; font-weight: 600;">${section.title}</h2>
      <p style="color: #4a4a4a; font-size: 14px; margin: 0 0 12px 0; line-height: 1.5;">${section.content}</p>
      ${section.items ? `
        <ul style="margin: 0; padding: 0 0 0 20px;">
          ${section.items.map(item => `
            <li style="color: #4a4a4a; font-size: 14px; margin-bottom: 8px;">
              ${item.link 
                ? `<a href="${appUrl}${item.link}" style="color: #2563eb; text-decoration: none;">${item.text}</a>`
                : item.text
              }
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');

  const aiTipHtml = digest.aiTip ? `
    <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 500;">AI Sales Tip</p>
      <p style="color: #1e3a5f; font-size: 14px; margin: 8px 0 0 0; line-height: 1.5;">${digest.aiTip}</p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">PCBancard Sales Digest</h1>
        </div>
        
        <div style="padding: 32px 24px;">
          <p style="color: #1a1a1a; font-size: 16px; margin: 0 0 24px 0;">${digest.greeting}</p>
          
          ${sectionHtml}
          
          ${aiTipHtml}
          
          <p style="color: #4a4a4a; font-size: 14px; margin: 24px 0 0 0; line-height: 1.5;">${digest.closing}</p>
          
          <div style="margin-top: 32px; text-align: center;">
            <a href="${appUrl}/pipeline" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Pipeline</a>
          </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 16px 24px; text-align: center;">
          <p style="color: #888; font-size: 12px; margin: 0;">
            <a href="${appUrl}/profile" style="color: #2563eb; text-decoration: none;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
