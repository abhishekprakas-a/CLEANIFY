import type { NextRequest } from "next/server";
import { handleRoute } from "@/lib/apiHandler";
import { created } from "@/lib/apiResponse";
import { requireRole } from "@/lib/authGuard";
import { submissionService } from "@/services";
import { createSubmissionSchema } from "@/schemas/submissionSchema";
import { roles } from "@/constants";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const user = await requireRole([roles.admin, roles.technician]);
    const input = createSubmissionSchema.parse(await req.json());
    const submission = await submissionService.submit(params.id, input, user);
    return created(submission);
  });
}
