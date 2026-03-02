import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/claude";
import { z } from "zod";

const recommendRequestSchema = z.object({
    name: z.string().min(1),
    category: z.string().optional(),
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
        const data = recommendRequestSchema.parse(body);

        const message = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: `Du er en ekspert på salg av nettsider og SaaS-løsninger i Norge.
Brukeren har nettopp generert et utkast for en nettside til denne bedriften:
- Navn: ${data.name}
- Kategori: ${data.category || "Ukjent bedriftstype"}

Målet er å vise nettsidens potensielle verdi (i NOK) for kunden, og upsells i form av interaktive moduler/integrasjoner.
Generer en JSON-respons med nøyaktig følgende struktur KUN i JSON format:

{
  "baseValue": number, // Estimert verdi for en ren proff hjemmeside uten ekstra (f.eks 15000)
  "components": [
    {
      "id": string, // En unik kort ID (eks: "booking", "stripe", "chat")
      "title": string, // Attraktiv tittel (eks: "Smart Timebestilling")
      "description": string, // Kort selgende beskrivelse
      "iconName": string, // En av: "Calendar", "CreditCard", "MessageCircle", "ShoppingBag", "Users", "Map"
      "addedValue": number // Verdiøkningen denne modulen gir (f.eks 5000)
    }
  ]
}

Regler:
- Generer 3-4 komponent-anbefalinger som er HYTT RELEVANTE for bedriftens kategori.
- Hvis restaurant: Bordbestilling, Takeaway betaling.
- Hvis frisør/klinikk: Online timebestilling.
- Hvis håndverker: Kontaktskjema, Bildegalleri av prosjekter.
- Språket skal være norskt og selgende.
- SVAR KUN MED GYLDIG JSON, INGEN TEKST FØR ELLER ETTER.`,
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

        let cleanText = textContent.text.trim();
        if (cleanText.includes("\`\`\`")) {
            cleanText = cleanText.replace(/\`\`\`json\n?|\`\`\`\n?/g, "").trim();
        }

        try {
            const parsed = JSON.parse(cleanText);
            return NextResponse.json(parsed);
        } catch (parseErr) {
            console.error("[Recommend API] JSON Parse Error:", parseErr, "Text:", cleanText);
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
            err instanceof Error ? err.message : "Failed to generate recommendations";
        console.error("Recommend error:", err);
        return NextResponse.json(
            { error: errorMessage, code: "GENERATION_ERROR" },
            { status: 500 }
        );
    }
}
