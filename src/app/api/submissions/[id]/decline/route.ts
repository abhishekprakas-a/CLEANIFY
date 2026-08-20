import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { ok } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { submissionService } from "@/services";
import { declineSubmissionSchema } from "@/schemas/submissionSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const { reason } = declineSubmissionSchema.parse(await req.json());
    const submission = await submissionService.decline(params.id, reason, user);
    return ok(submission);
  });
}
