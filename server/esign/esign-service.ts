// ============================================
// E-Signature Service - Provider Abstraction
// ============================================

import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { esignRequests, esignDocumentTemplates, esignDocumentPackages, type EsignRequest, type InsertEsignRequest, type ESignProvider, type SignerRole, type ESignStatus, type SignerStatus } from "@shared/schema";
import { documentTemplates, documentPackages, getDocumentById, getPackageById, getPackageDocuments, type DocumentTemplate, type DocumentPackage } from "./document-library";
import { mapMerchantToFormFields, validateForm, generateId } from "./form-utils";

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

  private initializeProviders() {
    // Initialize provider configurations from environment
    if (process.env.SIGNNOW_API_KEY) {
      this.providers.set("signnow", {
        apiKey: process.env.SIGNNOW_API_KEY,
        environment: (process.env.SIGNNOW_ENV as "sandbox" | "production") || "sandbox"
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

  // SignNow implementation (placeholder)
  private async sendToSignNow(
    config: ProviderConfig,
    request: EsignRequest,
    options: { subject: string; message: string; expirationDays: number }
  ): Promise<SendDocumentResult> {
    // TODO: Implement actual SignNow API integration
    const externalRequestId = `signnow_${Date.now()}`;
    return {
      success: true,
      externalRequestId,
      signingUrl: `https://app.signnow.com/webapp/document/${externalRequestId}`
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
}

// Singleton instance
export const esignService = new ESignatureService();
