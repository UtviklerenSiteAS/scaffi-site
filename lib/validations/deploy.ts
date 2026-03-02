import { z } from "zod";

export const deployWebsiteSchema = z.object({
  websiteId: z.string().min(1),
});

export type DeployWebsiteInput = z.infer<typeof deployWebsiteSchema>;
