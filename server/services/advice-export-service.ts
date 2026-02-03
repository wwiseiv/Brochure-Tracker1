import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

export interface AdviceExportOptions {
  content: string;
  title: string;
  subtitle?: string;
  format: "pdf" | "docx";
  agentName?: string;
}

export interface EmailAdviceOptions {
  email: string;
  content: string;
  title: string;
  subtitle?: string;
  agentName?: string;
}

async function formatContentWithClaude(content: string, title: string): Promise<{
  formattedContent: string;
  sections: { heading: string; content: string }[];
}> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

  if (!anthropicApiKey || !anthropicBaseUrl) {
    console.log("[AdviceExport] No Anthropic API key, using raw content");
    return {
      formattedContent: content,
      sections: [{ heading: title, content }],
    };
  }

  try {
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
      baseURL: anthropicBaseUrl,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are formatting sales coaching advice for a professional document. Take this advice content and organize it into clear, well-structured sections.

ORIGINAL ADVICE:
${content}

Format this into a clean, professional document structure. Return a JSON object with:
{
  "sections": [
    { "heading": "Section Title", "content": "Section content with proper formatting..." }
  ]
}

Guidelines:
- Create 2-4 logical sections based on the content
- Use action-oriented headings (e.g., "Key Action Steps", "Recommended Approach", "Important Tips")
- Keep paragraphs concise and scannable
- Preserve all important details from the original
- Use bullet points or numbered lists where appropriate (format as • or 1. 2. 3.)
- Do not add new information, just organize what's there

Return ONLY the JSON, no other text.`,
        },
      ],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        formattedContent: parsed.sections.map((s: any) => `${s.heading}\n\n${s.content}`).join("\n\n"),
        sections: parsed.sections,
      };
    }
  } catch (error) {
    console.error("[AdviceExport] Claude formatting failed:", error);
  }

  return {
    formattedContent: content,
    sections: [{ heading: title, content }],
  };
}

export async function generateAdvicePdf(options: AdviceExportOptions): Promise<Buffer> {
  const { content, title, subtitle, agentName } = options;
  
  if (!content || content.trim().length === 0) {
    throw new Error("Content is required for PDF generation");
  }
  
  console.log("[AdviceExport] Generating PDF for:", title);
  
  const { sections } = await formatContentWithClaude(content, title);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header with PCBancard branding
    doc.fillColor("#7C5CFC")
       .fontSize(24)
       .font("Helvetica-Bold")
       .text("PCBancard", { align: "left" });
    
    doc.moveDown(0.5);
    
    // Title
    doc.fillColor("#1a1a2e")
       .fontSize(20)
       .font("Helvetica-Bold")
       .text(title, { align: "left" });
    
    if (subtitle) {
      doc.fontSize(12)
         .font("Helvetica")
         .fillColor("#64748b")
         .text(subtitle);
    }

    // Date
    doc.moveDown(0.3);
    doc.fontSize(10)
       .fillColor("#94a3b8")
       .text(`Generated: ${new Date().toLocaleDateString("en-US", { 
         year: "numeric", 
         month: "long", 
         day: "numeric" 
       })}`);
    
    // Divider line
    doc.moveDown(0.5);
    doc.strokeColor("#e2e8f0")
       .lineWidth(1)
       .moveTo(60, doc.y)
       .lineTo(552, doc.y)
       .stroke();
    doc.moveDown(1);

    // Content sections
    sections.forEach((section, index) => {
      if (index > 0) {
        doc.moveDown(0.8);
      }

      // Section heading
      doc.fillColor("#7C5CFC")
         .fontSize(14)
         .font("Helvetica-Bold")
         .text(section.heading);
      
      doc.moveDown(0.3);
      
      // Section content
      doc.fillColor("#334155")
         .fontSize(11)
         .font("Helvetica")
         .text(section.content, {
           align: "left",
           lineGap: 4,
         });
    });

    // Footer
    doc.moveDown(2);
    doc.strokeColor("#e2e8f0")
       .lineWidth(1)
       .moveTo(60, doc.y)
       .lineTo(552, doc.y)
       .stroke();
    doc.moveDown(0.5);

    if (agentName) {
      doc.fillColor("#64748b")
         .fontSize(10)
         .font("Helvetica")
         .text(`Prepared for: ${agentName}`, { align: "center" });
    }

    doc.fillColor("#94a3b8")
       .fontSize(9)
       .text("PCBancard Sales Coaching", { align: "center" });

    doc.end();
  });
}

export async function generateAdviceWord(options: AdviceExportOptions): Promise<Buffer> {
  const { content, title, subtitle, agentName } = options;
  
  if (!content || content.trim().length === 0) {
    throw new Error("Content is required for Word document generation");
  }
  
  console.log("[AdviceExport] Generating Word document for:", title);
  
  const { sections } = await formatContentWithClaude(content, title);

  const children: any[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "PCBancard",
          bold: true,
          size: 36,
          color: "7C5CFC",
        }),
      ],
    })
  );

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32,
          color: "1a1a2e",
        }),
      ],
      spacing: { before: 200, after: 100 },
    })
  );

  // Subtitle
  if (subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: subtitle,
            size: 22,
            color: "64748b",
          }),
        ],
      })
    );
  }

  // Date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`,
          size: 18,
          color: "94a3b8",
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Divider
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: "e2e8f0",
          style: BorderStyle.SINGLE,
          size: 1,
        },
      },
      spacing: { after: 300 },
    })
  );

  // Content sections
  sections.forEach((section) => {
    // Section heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            size: 26,
            color: "7C5CFC",
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    // Split content into paragraphs
    const paragraphs = section.content.split("\n\n");
    paragraphs.forEach((para) => {
      if (para.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.trim(),
                size: 22,
                color: "334155",
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }
    });
  });

  // Footer divider
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: "e2e8f0",
          style: BorderStyle.SINGLE,
          size: 1,
        },
      },
      spacing: { before: 400, after: 200 },
    })
  );

  // Footer
  if (agentName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Prepared for: ${agentName}`,
            size: 18,
            color: "64748b",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "PCBancard Sales Coaching",
          size: 16,
          color: "94a3b8",
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function emailAdvice(options: EmailAdviceOptions): Promise<void> {
  const { email, content, title, subtitle, agentName } = options;
  
  if (!email || !email.includes("@")) {
    throw new Error("Valid email address is required");
  }
  
  if (!content || content.trim().length === 0) {
    throw new Error("Content is required for email");
  }
  
  console.log("[AdviceExport] Sending email to:", email);

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("Email service not configured");
  }

  const resend = new Resend(resendApiKey);

  // Format content for HTML email
  const htmlContent = content
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        return `<li style="margin-bottom: 8px;">${line.trim().substring(1).trim()}</li>`;
      }
      if (line.trim().match(/^\d+\./)) {
        return `<li style="margin-bottom: 8px;">${line.trim().replace(/^\d+\./, "").trim()}</li>`;
      }
      if (line.trim()) {
        return `<p style="margin-bottom: 12px; color: #334155; line-height: 1.6;">${line}</p>`;
      }
      return "";
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7C5CFC; font-size: 28px; margin: 0 0 8px 0;">PCBancard</h1>
            <p style="color: #64748b; margin: 0;">Sales Coaching</p>
          </div>
          
          <!-- Title -->
          <h2 style="color: #1a1a2e; font-size: 22px; margin: 0 0 8px 0; text-align: center;">${title}</h2>
          ${subtitle ? `<p style="color: #64748b; text-align: center; margin: 0 0 24px 0;">${subtitle}</p>` : ""}
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <!-- Content -->
          <div style="color: #334155; font-size: 15px; line-height: 1.7;">
            ${htmlContent}
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <!-- Footer -->
          <div style="text-align: center;">
            ${agentName ? `<p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Prepared for: ${agentName}</p>` : ""}
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Generated on ${new Date().toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: "PCBancard <noreply@mail.pcbancard.com>",
    to: email,
    subject: `${title} - PCBancard Sales Coaching`,
    html,
  });

  console.log("[AdviceExport] Email sent successfully");
}
