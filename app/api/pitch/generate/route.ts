import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/claude";
import { z } from "zod";

const pitchRequestSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  rating: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = pitchRequestSchema.parse(body);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Du er en salgskonsulent som hjelper med å selge nettsider til lokale bedrifter i Norge.

Bedriftsinformasjon:
- Navn: ${data.name}
${data.category ? `- Kategori: ${data.category}` : ""}
${data.address ? `- Adresse: ${data.address}` : ""}
${data.phone ? `- Telefon: ${data.phone}` : ""}
${data.rating ? `- Google-rating: ${data.rating}/5` : ""}

Generer følgende på norsk, i JSON-format:

1. "phonePitch": En kort, naturlig salgspitch for telefonsamtale (2-3 setninger). Start med "Hei, mitt navn er [navn]..." og forklar at du har laget en profesjonell nettside for dem.

2. "phoneTips": En array med 5-6 konkrete tips for telefonsamtalen. Korte, handlingsrettede punkter.

3. "emailSubject": Et kort, profesjonelt emnefelt for e-post.

4. "emailBody": En profesjonell e-posttekst (3-4 avsnitt). Inkluder plassholder [DITT NAVN] og [DIN KONTAKTINFO].

Svar KUN med gyldig JSON, ingen annen tekst.`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI", code: "AI_ERROR" },
        { status: 500 }
      );
    }

    // Sanitize JSON from possible markdown fences
    let cleanText = textContent.text.trim();
    if (cleanText.includes("```")) {
      console.log("[Pitch API] Sanitizing markdown fences from response");
      cleanText = cleanText.replace(/```json\n?|```\n?/g, "").trim();
    }

    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error("[Pitch API] JSON Parse Error:", parseErr, "Text:", cleanText);
      return NextResponse.json(
        { error: "AI returned invalid JSON format", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const errorMessage =
      err instanceof Error ? err.message : "Failed to generate pitch";
    console.error("Pitch generation error:", err);
    return NextResponse.json(
      { error: errorMessage, code: "GENERATION_ERROR" },
      { status: 500 }
    );
  }
}
