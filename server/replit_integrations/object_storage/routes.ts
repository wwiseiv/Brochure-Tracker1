import type { Express, Request, Response } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import multer from "multer";
import { isAuthenticated } from "../auth/replitAuth";

// Allowed image MIME types for profile/logo uploads
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml"
];

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
// Configure multer for memory storage with image filtering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)"));
    }
  }
});

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  /**
   * Direct proxy upload endpoint - bypasses browser CORS issues with GCS.
   * POST /api/uploads/proxy
   * 
   * Uses multipart/form-data for file upload.
   * Returns the object path for later retrieval.
   * 
   * NOTE: Requires authentication and only accepts image files.
   */
  app.post("/api/uploads/proxy", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    console.log("[Upload Proxy] Request received");
    try {
      if (!req.file) {
        console.log("[Upload Proxy] Error: No file in request");
        return res.status(400).json({ error: "No file provided" });
      }

      console.log("[Upload Proxy] File received:", req.file.originalname, "size:", req.file.size, "type:", req.file.mimetype);

      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      if (!privateObjectDir) {
        console.error("[Upload Proxy] Error: Private object directory not configured");
        return res.status(500).json({ error: "Object storage not configured" });
      }
      
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/uploads/${objectId}`;
      console.log("[Upload Proxy] Target path:", fullPath);

      // Parse bucket and object name from path
      const pathWithoutLeadingSlash = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
      const [bucketName, ...rest] = pathWithoutLeadingSlash.split("/");
      const objectName = rest.join("/");

      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Upload the file buffer directly to GCS
      console.log("[Upload Proxy] Uploading to GCS, bucket:", bucketName, "object:", objectName);
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype || "application/octet-stream",
        metadata: {
          originalName: req.file.originalname
        }
      });

      const objectPath = `/objects/uploads/${objectId}`;
      console.log("[Upload Proxy] Success, objectPath:", objectPath);

      res.json({
        objectPath,
        metadata: {
          name: req.file.originalname,
          size: req.file.size,
          contentType: req.file.mimetype
        }
      });
    } catch (error: any) {
      console.error("[Upload Proxy] Error:", error?.message || error);
      console.error("[Upload Proxy] Stack:", error?.stack);
      res.status(500).json({ error: "Failed to upload file", details: error?.message });
    }
  });
}

