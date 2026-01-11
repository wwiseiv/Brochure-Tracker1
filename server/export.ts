import ExcelJS from "exceljs";
import { Referral, Drop, Merchant } from "@shared/schema";

export type ExportFormat = "csv" | "xlsx";

interface ExportOptions {
  format: ExportFormat;
  filename: string;
}

export async function exportReferrals(
  referrals: Referral[],
  options: ExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Referrals");

  worksheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Created", key: "createdAt", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Business Name", key: "referredBusinessName", width: 25 },
    { header: "Contact Name", key: "referredContactName", width: 20 },
    { header: "Phone", key: "referredPhone", width: 15 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Source Drop ID", key: "sourceDropId", width: 12 },
    { header: "Referring Party", key: "referringPartyName", width: 20 },
    { header: "Referring Party Email", key: "referringPartyEmail", width: 25 },
    { header: "Referring Party Phone", key: "referringPartyPhone", width: 15 },
    { header: "Referring Party Business", key: "referringPartyBusinessName", width: 25 },
    { header: "Thank You Sent", key: "thankYouEmailSentAt", width: 12 },
    { header: "Converted At", key: "convertedAt", width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  referrals.forEach((referral) => {
    worksheet.addRow({
      id: referral.id,
      createdAt: referral.createdAt ? formatDate(referral.createdAt) : "",
      status: referral.status,
      referredBusinessName: referral.referredBusinessName || "",
      referredContactName: referral.referredContactName || "",
      referredPhone: referral.referredPhone || "",
      notes: referral.notes || "",
      sourceDropId: referral.sourceDropId || "",
      referringPartyName: referral.referringPartyName || "",
      referringPartyEmail: referral.referringPartyEmail || "",
      referringPartyPhone: referral.referringPartyPhone || "",
      referringPartyBusinessName: referral.referringPartyBusinessName || "",
      thankYouEmailSentAt: referral.thankYouEmailSentAt ? formatDate(referral.thankYouEmailSentAt) : "",
      convertedAt: referral.convertedAt ? formatDate(referral.convertedAt) : "",
    });
  });

  if (options.format === "csv") {
    const buffer = await workbook.csv.writeBuffer();
    return Buffer.from(buffer);
  } else {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export async function exportDrops(
  drops: Drop[],
  options: ExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Drops");

  worksheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Dropped At", key: "droppedAt", width: 12 },
    { header: "Brochure ID", key: "brochureId", width: 15 },
    { header: "Business Name", key: "businessName", width: 25 },
    { header: "Business Type", key: "businessType", width: 15 },
    { header: "Contact Name", key: "contactName", width: 20 },
    { header: "Business Phone", key: "businessPhone", width: 15 },
    { header: "Address", key: "address", width: 35 },
    { header: "Latitude", key: "latitude", width: 12 },
    { header: "Longitude", key: "longitude", width: 12 },
    { header: "Notes", key: "textNotes", width: 30 },
    { header: "Pickup Scheduled", key: "pickupScheduledFor", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Picked Up At", key: "pickedUpAt", width: 12 },
    { header: "Outcome", key: "outcome", width: 12 },
    { header: "Outcome Notes", key: "outcomeNotes", width: 30 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  drops.forEach((drop) => {
    worksheet.addRow({
      id: drop.id,
      droppedAt: drop.droppedAt ? formatDate(drop.droppedAt) : "",
      brochureId: drop.brochureId || "",
      businessName: drop.businessName || "",
      businessType: drop.businessType || "",
      contactName: drop.contactName || "",
      businessPhone: drop.businessPhone || "",
      address: drop.address || "",
      latitude: drop.latitude || "",
      longitude: drop.longitude || "",
      textNotes: drop.textNotes || "",
      pickupScheduledFor: drop.pickupScheduledFor ? formatDate(drop.pickupScheduledFor) : "",
      status: drop.status || "",
      pickedUpAt: drop.pickedUpAt ? formatDate(drop.pickedUpAt) : "",
      outcome: drop.outcome || "",
      outcomeNotes: drop.outcomeNotes || "",
    });
  });

  if (options.format === "csv") {
    const buffer = await workbook.csv.writeBuffer();
    return Buffer.from(buffer);
  } else {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export async function exportMerchants(
  merchants: Merchant[],
  options: ExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Merchants");

  worksheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Created", key: "createdAt", width: 12 },
    { header: "Business Name", key: "businessName", width: 25 },
    { header: "Business Type", key: "businessType", width: 15 },
    { header: "Contact Name", key: "contactName", width: 20 },
    { header: "Business Phone", key: "businessPhone", width: 15 },
    { header: "Email", key: "email", width: 25 },
    { header: "Address", key: "address", width: 35 },
    { header: "Last Visit", key: "lastVisitAt", width: 12 },
    { header: "Total Drops", key: "totalDrops", width: 10 },
    { header: "Conversions", key: "totalConversions", width: 10 },
    { header: "Lead Score", key: "leadScore", width: 10 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  merchants.forEach((merchant) => {
    worksheet.addRow({
      id: merchant.id,
      createdAt: merchant.createdAt ? formatDate(merchant.createdAt) : "",
      businessName: merchant.businessName || "",
      businessType: merchant.businessType || "",
      contactName: merchant.contactName || "",
      businessPhone: merchant.businessPhone || "",
      email: merchant.email || "",
      address: merchant.address || "",
      lastVisitAt: merchant.lastVisitAt ? formatDate(merchant.lastVisitAt) : "",
      totalDrops: merchant.totalDrops || 0,
      totalConversions: merchant.totalConversions || 0,
      leadScore: merchant.leadScore || 0,
      notes: merchant.notes || "",
    });
  });

  if (options.format === "csv") {
    const buffer = await workbook.csv.writeBuffer();
    return Buffer.from(buffer);
  } else {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
