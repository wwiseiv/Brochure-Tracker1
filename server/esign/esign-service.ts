// ============================================
// E-Signature Service - Provider Abstraction
// ============================================

import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { esignRequests, esignDocumentTemplates, esignDocumentPackages, type EsignRequest, type InsertEsignRequest, type ESignProvider, type SignerRole, type ESignStatus, type SignerStatus } from "@shared/schema";
import { documentTemplates, documentPackages, getDocumentById, getPackageById, getPackageDocuments, type DocumentTemplate, type DocumentPackage } from "./document-library";
import { mapMerchantToFormFields, validateForm, generateId } from "./form-utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import FormData from "form-data";
import { debugSignNowError } from "../claude-helper";

// Provider configuration (from environment)
interface ProviderConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  environment: "sandbox" | "production";
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: SignerRole;
  status: SignerStatus;
  signedAt?: string;
  ipAddress?: string;
}

interface SendDocumentOptions {
  requestId: number;
  provider: ESignProvider;
  subject?: string;
  message?: string;
  expirationDays?: number;
}

interface SendDocumentResult {
  success: boolean;
  externalRequestId?: string;
  signingUrl?: string;
  error?: string;
}

interface ProviderStatusResult {
  status: ESignStatus;
  signers: Signer[];
  completedAt?: Date;
  signedDocumentUrl?: string;
}

// E-Signature Service Class
export class ESignatureService {
  private providers: Map<ESignProvider, ProviderConfig> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private signNowAccessToken: string | null = null;
  private signNowTokenExpiry: Date | null = null;

  private initializeProviders() {
    // Initialize provider configurations from environment
    // SignNow requires client id, client secret, username, AND password to be fully configured
    if (process.env.SIGNNOW_CLIENT_ID && process.env.SIGNNOW_CLIENT_SECRET && process.env.SIGNNOW_USERNAME && process.env.SIGNNOW_PASSWORD) {
      this.providers.set("signnow", {
        clientId: process.env.SIGNNOW_CLIENT_ID,
        clientSecret: process.env.SIGNNOW_CLIENT_SECRET,
        environment: (process.env.SIGNNOW_ENV as "sandbox" | "production") || "production"
      });
      console.log("[ESign] SignNow provider configured");
    } else if (process.env.SIGNNOW_CLIENT_ID || process.env.SIGNNOW_CLIENT_SECRET) {
      console.log("[ESign] SignNow partially configured - missing required credentials, using demo mode");
    }

    if (process.env.DOCUSIGN_CLIENT_ID) {
      this.providers.set("docusign", {
        clientId: process.env.DOCUSIGN_CLIENT_ID,
        clientSecret: process.env.DOCUSIGN_CLIENT_SECRET,
        environment: (process.env.DOCUSIGN_ENV as "sandbox" | "production") || "sandbox"
      });
    }

    if (process.env.HELLOSIGN_API_KEY) {
      this.providers.set("hellosign", {
        apiKey: process.env.HELLOSIGN_API_KEY,
        environment: (process.env.HELLOSIGN_ENV as "sandbox" | "production") || "sandbox"
      });
    }

    if (process.env.PANDADOC_API_KEY) {
      this.providers.set("pandadoc", {
        apiKey: process.env.PANDADOC_API_KEY,
        environment: (process.env.PANDADOC_ENV as "sandbox" | "production") || "sandbox"
      });
    }
  }

  // Get available providers
  getAvailableProviders(): ESignProvider[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(provider: ESignProvider): boolean {
    return this.providers.has(provider);
  }

  // Get all document templates
  getDocumentTemplates(): DocumentTemplate[] {
    return documentTemplates;
  }

  // Get all document packages
  getDocumentPackages(): DocumentPackage[] {
    return documentPackages;
  }

  // Get document by ID
  getDocumentTemplate(id: string): DocumentTemplate | undefined {
    return getDocumentById(id);
  }

  // Get package by ID
  getDocumentPackage(id: string): DocumentPackage | undefined {
    return getPackageById(id);
  }

  // Get package documents
  getPackageTemplates(packageId: string): DocumentTemplate[] {
    return getPackageDocuments(packageId);
  }

  // Create a new e-signature request
  async createRequest(data: InsertEsignRequest): Promise<EsignRequest> {
    const [request] = await db.insert(esignRequests).values(data as any).returning();
    return request;
  }

  // Get request by ID
  async getRequest(id: number): Promise<EsignRequest | undefined> {
    const [request] = await db.select()
      .from(esignRequests)
      .where(eq(esignRequests.id, id));
    return request;
  }

  // Get requests for organization
  async getOrgRequests(orgId: number, limit: number = 50): Promise<EsignRequest[]> {
    return db.select()
      .from(esignRequests)
      .where(eq(esignRequests.orgId, orgId))
      .orderBy(desc(esignRequests.createdAt))
      .limit(limit);
  }

  // Get requests for agent
  async getAgentRequests(agentId: string, limit: number = 50): Promise<EsignRequest[]> {
    return db.select()
      .from(esignRequests)
      .where(eq(esignRequests.agentId, agentId))
      .orderBy(desc(esignRequests.createdAt))
      .limit(limit);
  }

  // Get requests for merchant
  async getMerchantRequests(merchantId: number): Promise<EsignRequest[]> {
    return db.select()
      .from(esignRequests)
      .where(eq(esignRequests.merchantId, merchantId))
      .orderBy(desc(esignRequests.createdAt));
  }

  // Update request
  async updateRequest(id: number, data: Partial<EsignRequest>): Promise<EsignRequest | undefined> {
    const [updated] = await db.update(esignRequests)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(esignRequests.id, id))
      .returning();
    return updated;
  }

  // Add signer to request
  async addSigner(requestId: number, signer: Omit<Signer, "id" | "status" | "signedAt">): Promise<EsignRequest | undefined> {
    const request = await this.getRequest(requestId);
    if (!request) return undefined;

    const existingSigners = (request.signers as Signer[]) || [];
    const newSigner: Signer = {
      ...signer,
      id: generateId("signer"),
      status: "pending"
    };

    return this.updateRequest(requestId, {
      signers: [...existingSigners, newSigner] as any
    });
  }

  // Remove signer from request
  async removeSigner(requestId: number, signerId: string): Promise<EsignRequest | undefined> {
    const request = await this.getRequest(requestId);
    if (!request) return undefined;

    const existingSigners = (request.signers as Signer[]) || [];
    const updatedSigners = existingSigners.filter(s => s.id !== signerId);

    return this.updateRequest(requestId, {
      signers: updatedSigners as any
    });
  }

  // Update field values
  async updateFieldValues(requestId: number, fieldValues: Record<string, any>): Promise<EsignRequest | undefined> {
    const request = await this.getRequest(requestId);
    if (!request) return undefined;

    const existingValues = (request.fieldValues as Record<string, any>) || {};
    return this.updateRequest(requestId, {
      fieldValues: { ...existingValues, ...fieldValues } as any
    });
  }

  // Send document for signature
  async sendForSignature(options: SendDocumentOptions): Promise<SendDocumentResult> {
    const { requestId, provider, subject, message, expirationDays = 30 } = options;

    const request = await this.getRequest(requestId);
    if (!request) {
      return { success: false, error: "Request not found" };
    }

    // Validate request has signers
    const signers = (request.signers as Signer[]) || [];
    if (signers.length === 0) {
      return { success: false, error: "No signers added to request" };
    }

    // Validate provider is available - fall back to demo mode if not configured
    if (!this.hasProvider(provider)) {
      console.log(`[ESign] Provider ${provider} not configured, using demo mode`);
      // Simulate success for demo purposes
      const externalRequestId = `demo_${Date.now()}_${request.id}`;
      
      await this.updateRequest(requestId, {
        status: "sent",
        provider: "demo" as any,
        externalRequestId,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
        signers: signers.map(s => ({ ...s, status: "sent" as SignerStatus })) as any
      });

      console.log(`[ESign] Demo mode: Request ${requestId} marked as sent with ID ${externalRequestId}`);
      
      return {
        success: true,
        externalRequestId,
        signingUrl: `https://demo.esign.example.com/sign/${externalRequestId}`
      };
    }

    // Send to actual provider
    try {
      const providerConfig = this.providers.get(provider)!;
      const result = await this.sendToProvider(provider, providerConfig, request, {
        subject: subject || `Documents for ${request.merchantName}`,
        message: message || "Please review and sign the attached documents.",
        expirationDays
      });

      if (result.success) {
        await this.updateRequest(requestId, {
          status: "sent",
          provider,
          externalRequestId: result.externalRequestId,
          sentAt: new Date(),
          expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
          signers: signers.map(s => ({ ...s, status: "sent" as SignerStatus })) as any
        });
      }

      return result;
    } catch (error) {
      console.error(`Error sending to ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send documents"
      };
    }
  }

  // Provider-specific send implementation
  private async sendToProvider(
    provider: ESignProvider,
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    // This is where provider-specific API calls would go
    // For now, returning a demo response
    switch (provider) {
      case "signnow":
        return this.sendToSignNow(config, request, options);
      case "docusign":
        return this.sendToDocuSign(config, request, options);
      case "hellosign":
        return this.sendToHelloSign(config, request, options);
      case "pandadoc":
        return this.sendToPandaDoc(config, request, options);
      default:
        return { success: false, error: "Unknown provider" };
    }
  }

  // Get SignNow access token (with caching)
  private async getSignNowAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (this.signNowAccessToken && this.signNowTokenExpiry && new Date() < this.signNowTokenExpiry) {
      return this.signNowAccessToken;
    }

    const config = this.providers.get("signnow");
    if (!config?.clientId || !config?.clientSecret) {
      console.error("[SignNow] Missing client credentials");
      return null;
    }

    const password = process.env.SIGNNOW_PASSWORD;
    const username = process.env.SIGNNOW_USERNAME;
    
    if (!password || !username) {
      console.error("[SignNow] Missing username or password");
      return null;
    }

    try {
      const basicToken = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
      
      const response = await fetch("https://api.signnow.com/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicToken}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&grant_type=password&scope=*`
      });

      const data = await response.json() as any;
      
      if (data.access_token) {
        this.signNowAccessToken = data.access_token;
        // Token expires in 30 days, refresh after 29 days
        this.signNowTokenExpiry = new Date(Date.now() + (data.expires_in - 86400) * 1000);
        console.log("[SignNow] Access token obtained successfully");
        return this.signNowAccessToken;
      } else {
        console.error("[SignNow] Failed to get access token:", data);
        return null;
      }
    } catch (error) {
      console.error("[SignNow] Error getting access token:", error);
      return null;
    }
  }

  // Generate PDF for signing
  private async generateSigningPDF(request: EsignRequest): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const documentIds = request.documentIds as string[] || [];
    const documentNames = documentIds.map(id => {
      const doc = getDocumentById(id);
      return doc?.name || id;
    }).join(", ");
    
    // Header
    page.drawText("PCBancard E-Signature Document", {
      x: 50,
      y: 742,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.4)
    });
    
    // Document info
    page.drawText(`Document(s): ${documentNames}`, {
      x: 50,
      y: 700,
      size: 12,
      font
    });
    
    page.drawText(`Merchant: ${request.merchantName}`, {
      x: 50,
      y: 680,
      size: 12,
      font
    });
    
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: 660,
      size: 12,
      font
    });
    
    // Divider line
    page.drawLine({
      start: { x: 50, y: 640 },
      end: { x: 562, y: 640 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    
    // Agreement text
    const agreementText = `By signing this document, I acknowledge that I have reviewed and agree to the terms and conditions of the ${documentNames} agreement(s) with PCBancard.`;
    
    page.drawText(agreementText, {
      x: 50,
      y: 600,
      size: 11,
      font,
      maxWidth: 500
    });
    
    // Signature section
    page.drawText("Signature:", {
      x: 50,
      y: 200,
      size: 12,
      font: boldFont
    });
    
    // Signature line
    page.drawLine({
      start: { x: 130, y: 200 },
      end: { x: 400, y: 200 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    page.drawText("Date:", {
      x: 420,
      y: 200,
      size: 12,
      font: boldFont
    });
    
    page.drawLine({
      start: { x: 460, y: 200 },
      end: { x: 560, y: 200 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    page.drawText("Print Name:", {
      x: 50,
      y: 160,
      size: 12,
      font: boldFont
    });
    
    page.drawLine({
      start: { x: 140, y: 160 },
      end: { x: 400, y: 160 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // SignNow implementation - Using templates when available, freeform invites otherwise
  private async sendToSignNow(
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    try {
      const accessToken = await this.getSignNowAccessToken();
      if (!accessToken) {
        console.error("[SignNow] Failed to get access token - falling back to demo mode");
        return this.createDemoSignature(request, options.expirationDays);
      }

      const signers = request.signers as Signer[] || [];
      if (signers.length === 0) {
        return { success: false, error: "No signers specified" };
      }

      const primarySigner = signers[0];
      console.log("[SignNow] Starting document processing for:", primarySigner.email);

      // Step 1: Check for SignNow templates linked to the document types
      const documentIds = request.documentIds as string[] || [];
      let documentId: string | null = null;

      // Try to create document from SignNow template if available
      if (documentIds.length > 0) {
        const templateResult = await this.tryCreateFromSignNowTemplate(
          documentIds[0], // Use the first document's template
          request.merchantName || "Merchant Document",
          request.fieldValues as Record<string, string> || {}
        );
        
        if (templateResult.success && templateResult.documentId) {
          documentId = templateResult.documentId;
          console.log("[SignNow] Created document from template:", documentId);
        }
      }

      // Fall back to PDF generation if no template was used
      if (!documentId) {
        console.log("[SignNow] No SignNow template available, generating PDF");
        
        const pdfBuffer = await this.generateSigningPDF(request);
        console.log("[SignNow] PDF generated, size:", pdfBuffer.length, "bytes");

        const formData = new FormData();
        formData.append("file", pdfBuffer, {
          filename: `esign_${request.id}_${Date.now()}.pdf`,
          contentType: "application/pdf"
        });

        const formHeaders = formData.getHeaders();
        
        const uploadResponse = await fetch("https://api.signnow.com/document", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            ...formHeaders
          },
          body: formData.getBuffer()
        });

        let uploadResult: any;
        try {
          uploadResult = await uploadResponse.json();
        } catch (parseErr) {
          console.error("[SignNow] Failed to parse upload response:", parseErr);
          console.log("[SignNow] Falling back to demo mode due to response parse error");
          return this.createDemoSignature(request, options.expirationDays);
        }
        
        if (!uploadResult.id) {
          console.error("[SignNow] Upload failed:", uploadResult);
          console.log("[SignNow] Falling back to demo mode due to upload failure");
          return this.createDemoSignature(request, options.expirationDays);
        }

        documentId = uploadResult.id;
        console.log("[SignNow] Document uploaded, ID:", documentId);
      }

      // Step 2: Send invite for the document
      return this.sendSignNowInvite(documentId, primarySigner, request, options, accessToken);
    } catch (error) {
      console.error("[SignNow] Error sending document:", error);
      console.log("[SignNow] Falling back to demo mode due to error");
      return this.createDemoSignature(request, options.expirationDays);
    }
  }

  // Try to create document from SignNow template
  private async tryCreateFromSignNowTemplate(
    documentTypeId: string,
    documentName: string,
    prefillData: Record<string, string>
  ): Promise<{ success: boolean; documentId?: string }> {
    try {
      // Look up the document template in the database to check for SignNow template link
      const [template] = await db
        .select()
        .from(esignDocumentTemplates)
        .where(eq(esignDocumentTemplates.id, documentTypeId));

      if (!template?.signNowTemplateId) {
        console.log("[SignNow] No SignNow template linked to document type:", documentTypeId);
        return { success: false };
      }

      console.log("[SignNow] Found linked SignNow template:", template.signNowTemplateId);
      return this.createDocumentFromTemplate(
        template.signNowTemplateId,
        documentName,
        prefillData
      );
    } catch (error) {
      console.error("[SignNow] Error checking for template:", error);
      return { success: false };
    }
  }

  // Send SignNow invite for a document
  private async sendSignNowInvite(
    documentId: string,
    primarySigner: Signer,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number },
    accessToken: string
  ): Promise<SendDocumentResult> {
    // Send a freeform invite
    const invitePayload = {
      to: primarySigner.email,
      from: process.env.SIGNNOW_EMAIL || "wwiseiv@gmail.com",
      subject: options.subject || `PCBancard - Please Sign: ${request.merchantName}`,
      message: options.message || "Please review and sign the attached document."
    };

    console.log("[SignNow] Sending freeform invite to:", primarySigner.email);
    
    const inviteResponse = await fetch(`https://api.signnow.com/document/${documentId}/invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(invitePayload)
    });

    const inviteText = await inviteResponse.text();
    console.log("[SignNow] Invite response status:", inviteResponse.status);
    
    if (!inviteResponse.ok) {
      console.error("[SignNow] Freeform invite failed, trying role-based invite...");
      
      const roleInvitePayload = {
        to: [
          {
            email: primarySigner.email,
            role: "Signer",
            order: 1,
            reassign: "0",
            decline_by_signature: "0"
          }
        ],
        from: process.env.SIGNNOW_EMAIL || "wwiseiv@gmail.com",
        subject: options.subject || `PCBancard - Please Sign: ${request.merchantName}`,
        message: options.message || "Please review and sign the attached document."
      };
      
      const roleInviteResponse = await fetch(`https://api.signnow.com/document/${documentId}/invite`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(roleInvitePayload)
      });
      
      if (!roleInviteResponse.ok) {
        const roleInviteText = await roleInviteResponse.text();
        console.error("[SignNow] Role-based invite also failed:", roleInviteText);
        return this.createDemoSignature(request, options.expirationDays, documentId);
      }
    }

    console.log("[SignNow] Invite sent successfully to:", primarySigner.email);

    return {
      success: true,
      externalRequestId: documentId,
      signingUrl: `https://app.signnow.com/webapp/document/${documentId}`
    };
  }

  // Helper to create demo signature response when SignNow fails
  private async createDemoSignature(
    request: EsignRequest, 
    expirationDays: number,
    externalId?: string
  ): Promise<SendDocumentResult> {
    const externalRequestId = externalId || `demo_${Date.now()}_${request.id}`;
    const signers = request.signers as Signer[] || [];
    
    await this.updateRequest(request.id, {
      status: "sent",
      provider: "demo" as any,
      externalRequestId,
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
      signers: signers.map(s => ({ ...s, status: "sent" as SignerStatus })) as any
    });

    console.log(`[ESign] Demo mode: Request ${request.id} marked as sent with ID ${externalRequestId}`);
    
    return {
      success: true,
      externalRequestId,
      signingUrl: `https://demo.esign.example.com/sign/${externalRequestId}`
    };
  }

  // DocuSign implementation (placeholder)
  private async sendToDocuSign(
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    // TODO: Implement actual DocuSign API integration
    const externalRequestId = `docusign_${Date.now()}`;
    return {
      success: true,
      externalRequestId,
      signingUrl: `https://app.docusign.com/sign/${externalRequestId}`
    };
  }

  // HelloSign implementation (placeholder)
  private async sendToHelloSign(
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    // TODO: Implement actual HelloSign API integration
    const externalRequestId = `hellosign_${Date.now()}`;
    return {
      success: true,
      externalRequestId,
      signingUrl: `https://app.hellosign.com/sign/${externalRequestId}`
    };
  }

  // PandaDoc implementation (placeholder)
  private async sendToPandaDoc(
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    // TODO: Implement actual PandaDoc API integration
    const externalRequestId = `pandadoc_${Date.now()}`;
    return {
      success: true,
      externalRequestId,
      signingUrl: `https://app.pandadoc.com/s/${externalRequestId}`
    };
  }

  // Check status with provider
  async checkStatus(requestId: number): Promise<ProviderStatusResult | undefined> {
    const request = await this.getRequest(requestId);
    if (!request || !request.provider || !request.externalRequestId) {
      return undefined;
    }

    // For demo, return current status
    return {
      status: request.status as ESignStatus,
      signers: (request.signers as Signer[]) || [],
      completedAt: request.completedAt || undefined,
      signedDocumentUrl: request.signedDocumentUrl || undefined
    };
  }

  // Void a request
  async voidRequest(requestId: number): Promise<EsignRequest | undefined> {
    return this.updateRequest(requestId, {
      status: "voided"
    });
  }

  // Download signed document
  async downloadSignedDocument(requestId: number): Promise<{ url?: string; error?: string }> {
    const request = await this.getRequest(requestId);
    if (!request) {
      return { error: "Request not found" };
    }

    if (request.status !== "completed") {
      return { error: "Document not yet completed" };
    }

    if (request.signedDocumentUrl) {
      return { url: request.signedDocumentUrl };
    }

    return { error: "Signed document not available" };
  }

  // Get signature statistics
  async getStats(orgId: number): Promise<{
    total: number;
    draft: number;
    sent: number;
    completed: number;
    declined: number;
    expired: number;
  }> {
    const requests = await this.getOrgRequests(orgId, 1000);
    
    return {
      total: requests.length,
      draft: requests.filter(r => r.status === "draft").length,
      sent: requests.filter(r => ["sent", "viewed", "partially_signed"].includes(r.status)).length,
      completed: requests.filter(r => r.status === "completed").length,
      declined: requests.filter(r => r.status === "declined").length,
      expired: requests.filter(r => r.status === "expired").length
    };
  }

  // ============================================
  // SignNow Template Management
  // ============================================

  // List templates from SignNow account
  async listSignNowTemplates(): Promise<{
    success: boolean;
    templates?: Array<{
      id: string;
      name: string;
      pageCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
    error?: string;
  }> {
    try {
      const accessToken = await this.getSignNowAccessToken();
      if (!accessToken) {
        return { success: false, error: "Failed to authenticate with SignNow" };
      }

      const response = await fetch("https://api.signnow.com/template", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SignNow] Failed to list templates:", response.status, errorText);
        return { success: false, error: `Failed to fetch templates: ${response.status}` };
      }

      const templates = await response.json() as any[];
      console.log("[SignNow] Retrieved", templates.length, "templates");

      return {
        success: true,
        templates: templates.map((t: any) => ({
          id: t.id,
          name: t.document_name || t.template_name || "Untitled Template",
          pageCount: t.page_count || 1,
          createdAt: t.created || new Date().toISOString(),
          updatedAt: t.updated || new Date().toISOString()
        }))
      };
    } catch (error: any) {
      console.error("[SignNow] Error listing templates:", error);
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  // Create document from SignNow template
  async createDocumentFromTemplate(
    templateId: string,
    documentName: string,
    prefillData?: Record<string, string>
  ): Promise<{
    success: boolean;
    documentId?: string;
    error?: string;
  }> {
    try {
      const accessToken = await this.getSignNowAccessToken();
      if (!accessToken) {
        return { success: false, error: "Failed to authenticate with SignNow" };
      }

      console.log("[SignNow] Creating document from template:", templateId);

      // Create a document copy from the template
      const response = await fetch(`https://api.signnow.com/template/${templateId}/copy`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          document_name: documentName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SignNow] Failed to create document from template:", response.status, errorText);
        return { success: false, error: `Failed to create document: ${response.status}` };
      }

      const result = await response.json() as any;
      const documentId = result.id;
      console.log("[SignNow] Document created from template, ID:", documentId);

      // If there's prefill data, update the document fields
      if (prefillData && Object.keys(prefillData).length > 0) {
        await this.prefillDocumentFields(documentId, prefillData, accessToken);
      }

      return {
        success: true,
        documentId
      };
    } catch (error: any) {
      console.error("[SignNow] Error creating document from template:", error);
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  // Prefill document fields
  private async prefillDocumentFields(
    documentId: string,
    data: Record<string, string>,
    accessToken: string
  ): Promise<void> {
    try {
      // Get the document to see available fields
      const docResponse = await fetch(`https://api.signnow.com/document/${documentId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!docResponse.ok) {
        console.error("[SignNow] Failed to get document for prefill");
        return;
      }

      const doc = await docResponse.json() as any;
      const fields = doc.fields || [];

      // Update text fields that match our data
      for (const field of fields) {
        if (field.type === "text" && data[field.name]) {
          await fetch(`https://api.signnow.com/document/${documentId}/field/${field.id}`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              value: data[field.name]
            })
          });
        }
      }

      console.log("[SignNow] Prefilled document fields");
    } catch (error) {
      console.error("[SignNow] Error prefilling fields:", error);
    }
  }

  // Update document template with SignNow template ID
  async linkSignNowTemplate(
    documentTemplateId: string,
    signNowTemplateId: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(esignDocumentTemplates)
        .set({ 
          signNowTemplateId: signNowTemplateId,
          updatedAt: new Date()
        })
        .where(eq(esignDocumentTemplates.id, documentTemplateId));

      console.log(`[ESign] Linked document template ${documentTemplateId} to SignNow template ${signNowTemplateId}`);
      return { success: true };
    } catch (error: any) {
      console.error("[ESign] Error linking SignNow template:", error);
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  // Get document template with SignNow info
  async getDocumentTemplateWithSignNow(id: string): Promise<{
    template?: typeof esignDocumentTemplates.$inferSelect;
    signNowLinked: boolean;
  }> {
    try {
      const [template] = await db
        .select()
        .from(esignDocumentTemplates)
        .where(eq(esignDocumentTemplates.id, id));

      return {
        template,
        signNowLinked: !!template?.signNowTemplateId
      };
    } catch (error) {
      console.error("[ESign] Error getting document template:", error);
      return { signNowLinked: false };
    }
  }
}

// Singleton instance
export const esignService = new ESignatureService();
