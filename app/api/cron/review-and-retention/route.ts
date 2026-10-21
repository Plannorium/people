import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { Settings } from "@/lib/models/Settings";
import { writeAudit } from "@/lib/audit";
import { deleteDocument } from "@/lib/storage";

// Vercel Cron calls GET with "Authorization: Bearer $CRON_SECRET"
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET authorization. Fail closed if the secret isn't configured.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron invocation." }, { status: 401 });
    }

    await connectDB();

    // 2. Load configured retention and review policies
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        reviewIntervalMonths: 6,
        retentionPeriodYears: 2,
        allowedEmailDomain: "plannorium.com",
        hrEmail: "hr@plannorium.com",
      });
    }

    const now = new Date();
    const results = {
      markedNeedsReview: 0,
      purgedOffboardedRecords: 0,
    };

    // 3. Mark records older than reviewIntervalMonths as 'needs_review'
    const reviewCutoff = new Date();
    reviewCutoff.setMonth(reviewCutoff.getMonth() - settings.reviewIntervalMonths);

    const outdatedEmployees = await Employee.find({
      status: "complete",
      $or: [
        { lastReviewedAt: { $lt: reviewCutoff } },
        { lastReviewedAt: { $exists: false } },
      ],
    });

    for (const emp of outdatedEmployees) {
      emp.status = "needs_review";
      await emp.save();
      results.markedNeedsReview++;

      await writeAudit({
        actorId: "system_cron",
        actorEmail: "system@plannorium.com",
        action: "update",
        targetEmployeeId: emp._id.toString(),
        fields: ["status (needs_review)"],
      });
    }

    // 4. Retention policy: delete documents and encrypted fields for offboarded staff past retention period
    const retentionCutoff = new Date();
    retentionCutoff.setFullYear(retentionCutoff.getFullYear() - settings.retentionPeriodYears);

    const expiredOffboarded = await Employee.find({
      status: "offboarded",
      offboardedAt: { $lt: retentionCutoff },
      // Skip records that were already purged (purged fields are unset)
      $or: [
        { "identification.documentNumberEnc": { $nin: [null, ""] } },
        { "identification.frontFileKey": { $nin: [null, ""] } },
        { "identification.backFileKey": { $nin: [null, ""] } },
        { "health.enc": { $nin: [null, ""] } },
      ],
    });

    for (const emp of expiredOffboarded) {
      // Clean up sensitive documents and encrypted blobs
      // Delete the stored ID files themselves, not just the references to them
      const keys = [emp.identification?.frontFileKey, emp.identification?.backFileKey].filter(
        Boolean
      ) as string[];
      await Promise.all(keys.map((key) => deleteDocument(key)));

      await Employee.updateOne(
        { _id: emp._id },
        {
          $unset: {
            "identification.documentNumberEnc": 1,
            "identification.documentLast4": 1,
            "identification.frontFileKey": 1,
            "identification.backFileKey": 1,
            health: 1,
            healthConsentAt: 1,
          },
        }
      );
      results.purgedOffboardedRecords++;

      await writeAudit({
        actorId: "system_cron",
        actorEmail: "system@plannorium.com",
        action: "delete",
        targetEmployeeId: emp._id.toString(),
        fields: ["identification.purged", "health.purged"],
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (err: any) {
    console.error("[Review & Retention Cron Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute review and retention cycle." },
      { status: 500 }
    );
  }
}
