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
    if (process.env.SIGNNOW_CLIENT_ID && process.env.SIGNNOW_CLIENT_SECRET) {
      this.providers.set("signnow", {
        clientId: process.env.SIGNNOW_CLIENT_ID,
        clientSecret: process.env.SIGNNOW_CLIENT_SECRET,
        environment: (process.env.SIGNNOW_ENV as "sandbox" | "production") || "production"
      });
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
    const [request] = await db.insert(esignRequests).values(data).returning();
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

    // Validate provider is available
    if (!this.hasProvider(provider)) {
      // For now, simulate success for demo purposes
      const externalRequestId = `demo_${Date.now()}`;
      
      await this.updateRequest(requestId, {
        status: "sent",
        provider,
        externalRequestId,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
        signers: signers.map(s => ({ ...s, status: "sent" as SignerStatus })) as any
      });

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
    const username = "wwiseiv@gmail.com"; // TODO: Make configurable
    
    if (!password) {
      console.error("[SignNow] Missing password");
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

  // SignNow implementation - Full API integration
  private async sendToSignNow(
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    try {
      const accessToken = await this.getSignNowAccessToken();
      if (!accessToken) {
        return { success: false, error: "Failed to authenticate with SignNow" };
      }

      const signers = request.signers as Signer[] || [];
      if (signers.length === 0) {
        return { success: false, error: "No signers specified" };
      }

      console.log("[SignNow] Starting document upload and invite process...");

      // Step 1: Generate PDF
      const pdfBuffer = await this.generateSigningPDF(request);
      console.log("[SignNow] PDF generated, size:", pdfBuffer.length, "bytes");

      // Step 2: Upload document to SignNow
      const formData = new FormData();
      formData.append("file", pdfBuffer, {
        filename: `esign_${request.id}_${Date.now()}.pdf`,
        contentType: "application/pdf"
      });

      const uploadResponse = await fetch("https://api.signnow.com/document", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        },
        body: formData as any
      });

      const uploadResult = await uploadResponse.json() as any;
      
      if (!uploadResult.id) {
        console.error("[SignNow] Upload failed:", uploadResult);
        return { success: false, error: uploadResult.error || "Failed to upload document" };
      }

      const documentId = uploadResult.id;
      console.log("[SignNow] Document uploaded, ID:", documentId);

      // Step 3: Add signature field to document
      const fieldsResponse = await fetch(`https://api.signnow.com/document/${documentId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: [
            {
              x: 130,
              y: 560, // Y is inverted in SignNow (from bottom)
              width: 270,
              height: 30,
              page_number: 0,
              role: "Signer 1",
              required: true,
              type: "signature"
            },
            {
              x: 460,
              y: 560,
              width: 100,
              height: 20,
              page_number: 0,
              role: "Signer 1",
              required: true,
              type: "date"
            },
            {
              x: 140,
              y: 600,
              width: 260,
              height: 20,
              page_number: 0,
              role: "Signer 1",
              required: true,
              type: "text",
              prefilled_text: signers[0]?.name || ""
            }
          ]
        })
      });

      const fieldsResult = await fieldsResponse.json() as any;
      console.log("[SignNow] Fields added:", fieldsResult.id ? "success" : fieldsResult);

      // Step 4: Send invite to signer
      const primarySigner = signers[0];
      const inviteResponse = await fetch(`https://api.signnow.com/document/${documentId}/invite`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: [{
            email: primarySigner.email,
            role: "Signer 1",
            role_id: "",
            order: 1,
            subject: options.subject,
            message: options.message
          }],
          from: "wwiseiv@gmail.com",
          subject: options.subject,
          message: options.message
        })
      });

      const inviteResult = await inviteResponse.json() as any;
      
      if (inviteResult.error) {
        console.error("[SignNow] Invite failed:", inviteResult);
        return { success: false, error: inviteResult.error };
      }

      console.log("[SignNow] Invite sent successfully to:", primarySigner.email);
      console.log("[SignNow] Invite result:", inviteResult);

      return {
        success: true,
        externalRequestId: documentId,
        signingUrl: `https://app.signnow.com/webapp/document/${documentId}`
      };
    } catch (error) {
      console.error("[SignNow] Error sending document:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send to SignNow"
      };
    }
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
}

// Singleton instance
export const esignService = new ESignatureService();
