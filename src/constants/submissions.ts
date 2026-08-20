/**
 * Field-evidence submissions (C5 pre-work + C8 completion). A technician bundles
 * photos + a details form into a submission; an approver (admin or the job's
 * supervisor) approves or declines it. Approval gates the job lifecycle.
 */
export const submissionType = {
  preWork: "preWork",
  completion: "completion",
} as const;

export type SubmissionType =
  (typeof submissionType)[keyof typeof submissionType];

export const allSubmissionTypes: SubmissionType[] =
  Object.values(submissionType);

export const submissionStatus = {
  pending: "pending",
  approved: "approved",
  declined: "declined",
} as const;

export type SubmissionStatus =
  (typeof submissionStatus)[keyof typeof submissionStatus];

export const allSubmissionStatuses: SubmissionStatus[] =
  Object.values(submissionStatus);

/**
 * Photo categories. `before`/`after` are the legacy kinds (kept for back-compat);
 * the v2 pre-work check adds `machinery` + `uniformMask`, and completion uses
 * `completion`.
 */
export const photoCategory = {
  before: "before",
  after: "after",
  machinery: "machinery",
  uniformMask: "uniformMask",
  completion: "completion",
} as const;

export type PhotoCategory =
  (typeof photoCategory)[keyof typeof photoCategory];

export const allPhotoCategories: PhotoCategory[] =
  Object.values(photoCategory);

/** Categories a technician must supply for each submission type. */
export const requiredPhotoCategories: Record<SubmissionType, PhotoCategory[]> = {
  preWork: [photoCategory.machinery, photoCategory.uniformMask],
  completion: [photoCategory.completion],
};

/** Minimum number of completion photos (OQ-4 default). */
export const minCompletionPhotos = 2;

/** Preset decline reasons offered to the approver (free text also allowed). */
export const declineReasonPresets = [
  "Photos unclear / not visible",
  "Machinery not shown or not in order",
  "Uniform / mask not worn correctly",
  "Wrong location or job",
  "Work incomplete",
] as const;
