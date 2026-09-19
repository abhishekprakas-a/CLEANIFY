import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { submissionService } from "@/services";
import { dayCheckSubmitSchema } from "@/schemas/submissionSchema";
import { roles, type SubmissionType } from "@/constants";

/** Technician submits a start-of-day / at-base machinery + uniform check. */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireRole([roles.technician]);
    const { type, photoIds } = dayCheckSubmitSchema.parse(await req.json());
    const submission = await submissionService.submitDayCheck(
      type as SubmissionType,
      photoIds,
      user,
    );
    return created(submission);
  });
}
