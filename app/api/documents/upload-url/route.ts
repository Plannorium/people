import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/access";
import {
  generateObjectKey,
  getPresignedUploadUrl,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const { contentType, fileSize } = await req.json();

    if (typeof contentType !== "string" || !ALLOWED_MIME_TYPES.has(contentType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, JPG, and PNG documents are accepted." },
        { status: 400 }
      );
    }

    if (typeof fileSize === "number" && fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB maximum limit." },
        { status: 400 }
      );
    }

    // Generate random UUID key - no employee name or personal data in object key
    const key = generateObjectKey("identification");

    // Generate signed upload parameters
    const uploadData = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json(uploadData);
  } catch (err) {
    return apiError(err, "Failed to generate upload URL.", "Presigned Upload URL Error");
  }
}
