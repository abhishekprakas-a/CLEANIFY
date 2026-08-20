export * from "./roles";
export * from "./permissions";
export * from "./jobStatus";
export * from "./jobStatusMeta";
export * from "./scheduling";
export * from "./booking";
export * from "./service";
export * from "./review";
export * from "./attendance";
export * from "./submissions";
export * from "./notifications";
export * from "./routes";

export const pagination = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const appConfig = {
  jobCodePrefix: "CLEANIFY",
} as const;
