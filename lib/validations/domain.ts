import { z } from "zod";

export const checkDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, "Invalid domain format"),
});

export const purchaseDomainSchema = z.object({
  domain: z.string().min(3),
  websiteId: z.string().min(1),
  registrant: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    stateProvince: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(2).max(2),
    phone: z.string().min(5),
    email: z.string().email(),
  }),
});

export const connectDomainSchema = z.object({
  domainId: z.string().min(1),
  websiteId: z.string().min(1),
});

export type CheckDomainInput = z.infer<typeof checkDomainSchema>;
export type PurchaseDomainInput = z.infer<typeof purchaseDomainSchema>;
export type ConnectDomainInput = z.infer<typeof connectDomainSchema>;
