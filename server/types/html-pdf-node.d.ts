declare module "html-pdf-node" {
  interface FileOptions {
    content?: string;
    url?: string;
  }

  interface PdfOptions {
    format?: "Letter" | "Legal" | "Tabloid" | "Ledger" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6";
    printBackground?: boolean;
    landscape?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }

  function generatePdf(file: FileOptions, options?: PdfOptions): Promise<Buffer>;
  function generatePdfs(files: FileOptions[], options?: PdfOptions): Promise<Buffer[]>;

  export default { generatePdf, generatePdfs };
}
