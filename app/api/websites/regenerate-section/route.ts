import { regenerateSectionSchema } from "@/lib/validations/website";
import { anthropic } from "@/lib/claude";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = regenerateSectionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { sectionHtml, sectionType, businessName, businessCategory, fullPageCssVars, userInstruction } = parsed.data;

  const prompt = `You are a senior front-end developer. Regenerate ONLY the following HTML section for the business "${businessName}" (${businessCategory ?? "Local Business"}).

CURRENT SECTION (type: ${sectionType}):
${sectionHtml}

${fullPageCssVars ? `The page uses these CSS custom properties — you MUST reuse them:\n${fullPageCssVars}` : ""}

${userInstruction ? `USER REQUEST: ${userInstruction}` : "Regenerate this section with a fresh design approach — different layout, copy, and visual treatment — while keeping the same content type and business information."}

RULES:
1. Return ONLY the new <section> HTML (or the appropriate element). No <!DOCTYPE>, no <html>, no <head>, no <body> wrapper.
2. Keep the same data-section-type="${sectionType}" attribute on the outermost element.
3. Use the same CSS custom property names (--color-primary, etc.) from the page.
4. Keep it responsive (mobile-first).
5. Do not wrap in markdown code fences.
6. Must be valid HTML that can be directly swapped into the page.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json(
        { error: "No text in AI response", code: "GENERATION_ERROR" },
        { status: 500 }
      );
    }

    return Response.json({ html: textBlock.text });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Section regeneration failed";
    console.error("Section regeneration error:", err);
    return Response.json(
      { error: errorMessage, code: "GENERATION_ERROR" },
      { status: 500 }
    );
  }
}
