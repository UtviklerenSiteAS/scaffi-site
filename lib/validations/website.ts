import { z } from "zod";

export const generateWebsiteSchema = z.object({
  placeId: z.string().min(1, "Place ID is required"),
  businessName: z.string().min(1, "Business name is required"),
  templateStyle: z.string().optional(),
  templateCategory: z.string().optional(),
  referenceUrls: z.array(z.string().url()).max(3).optional(),
});

export const saveWebsiteSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  htmlContent: z.string().min(100, "HTML content is required"),
  placeId: z.string().min(1, "Place ID is required"),
  businessAddress: z.string().nullable().optional(),
  businessPhone: z.string().nullable().optional(),
  businessRating: z.number().nullable().optional(),
  businessCategory: z.string().nullable().optional(),
  businessHours: z.string().nullable().optional(),
});

export const regenerateSectionSchema = z.object({
  sectionHtml: z.string().min(10, "Section HTML is required"),
  sectionType: z.string().min(1, "Section type is required"),
  businessName: z.string().min(1, "Business name is required"),
  businessCategory: z.string().nullable().optional(),
  fullPageCssVars: z.string().optional(),
  userInstruction: z.string().optional(),
});

export type GenerateWebsiteInput = z.infer<typeof generateWebsiteSchema>;
export type SaveWebsiteInput = z.infer<typeof saveWebsiteSchema>;
export type RegenerateSectionInput = z.infer<typeof regenerateSectionSchema>;
