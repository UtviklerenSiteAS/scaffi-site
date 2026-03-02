import { GoogleGenAI } from "@google/genai";
import type { PlaceDetails } from "@/lib/maps";

let geminiInstance: GoogleGenAI | null = null;

export function getGemini() {
  if (geminiInstance) return geminiInstance;
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) return null;
  geminiInstance = new GoogleGenAI({ apiKey: key });
  return geminiInstance;
}

/**
 * Helper to retry a function with exponential backoff.
 */
async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.log(`[Gemini] Request failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

/**
 * Generate a logo for a business using Imagen.
 * Returns a base64-encoded PNG string, or null if generation fails.
 */
export async function generateLogo(
  businessName: string,
  category: string | null
): Promise<string | null> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) return null;

  try {
    const prompt = `A clean, professional, modern logo icon for a business called "${businessName}". ${category ? `The business is a ${category}.` : ""
      } The logo should be a simple, memorable icon/symbol — no text, no words, no letters. Flat design, single color or minimal palette, white background. Suitable for web favicon and header. Vector-style, sharp edges.`;

    const client = getGemini();
    if (!client) return null;

    // Use retry helper for the heavy image generation call
    const response = await retry(() => client.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }));

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData?.data) return null;

    return part.inlineData.data;
  } catch (err) {
    console.error("Logo generation failed after retries:", err);
    return null;
  }
}

/**
 * Generate a hero image for a business using Imagen.
 * Returns a base64-encoded PNG string, or null if generation fails.
 */
export async function generateHeroImage(
  businessName: string,
  category: string | null
): Promise<string | null> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) return null;

  try {
    const prompt = `A photorealistic, editorial-style photograph of a ${category ?? "local business"
      } in Norway. The image shows the interior or exterior of "${businessName}" — warm lighting, inviting atmosphere, modern Scandinavian design. High quality, professional photography, 16:9 aspect ratio, no text overlays.`;

    const client = getGemini();
    if (!client) return null;

    const response = await retry(() => client.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }));

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData?.data) return null;

    return part.inlineData.data;
  } catch (err) {
    console.error("Hero image generation failed after retries:", err);
    return null;
  }
}

/**
 * Use Gemini 2.5 Flash with URL grounding to analyze reference websites
 * and generate a complete HTML page that mirrors their visual design.
 * Returns an async generator of text chunks for SSE streaming.
 * Called ONLY when the user has provided reference URLs — no templates used.
 */
export async function generateHtmlFromReferences(
  referenceUrls: string[],
  details: PlaceDetails,
  logoBase64: string | null,
  heroBase64: string | null,
  reviewAnalysis: string | null,
  jsonLd: string,
): Promise<AsyncGenerator<string> | null> {
  const client = getGemini();
  if (!client) return null;

  const urlList = referenceUrls.map((u, i) => `${i + 1}. ${u}`).join("\n");
  const hoursBlock = details.hours ? details.hours.join("\n") : "Ikke tilgjengelig.";
  const reviewsBlock =
    details.reviews && details.reviews.length > 0
      ? details.reviews
        .slice(0, 5)
        .map((r) => `- ${r.author} (${r.rating}/5): "${r.text.slice(0, 250)}"`)
        .join("\n")
      : "Ingen anmeldelser.";

  const photosBlock =
    details.photos.length > 0
      ? details.photos.map((u, i) => `Photo ${i + 1}: ${u}`).join("\n")
      : "";

  const prompt = `You are a world-class frontend developer and award-winning UI/UX designer.

═══════════════════════════════════════════════════
STEP 1 — ANALYZE THE REFERENCE WEBSITES
═══════════════════════════════════════════════════
Visit each of these URLs using your URL context tool and perform a thorough visual audit:
${urlList}

For each site, document PRECISELY:
COLORS: Exact hex for background, surface/card, primary brand, text, headings, CTA button, CTA text
TYPOGRAPHY: Font families (heading vs body), weights, sizes in the hero, h2, body
GEOMETRY: Border-radius — is it 0px (sharp), 4-8px (subtle), 16px (rounded), or 50px (pill)?
SHADOWS: None, subtle (0 2px 8px), medium, dramatic, or colored glow?
SPACING: How dense are the sections — tight, balanced, or airy?
BUTTONS: Filled/outlined/ghost? Rounded/sharp? With icons?

LAYOUT (this is the MOST important part of your analysis):
• HERO: What is the exact hero structure? Examples:
  - "Full-width solid color block, all text centered, prominent search bar below headline"
  - "Left text column + right large photo, split 50/50"
  - "Full-bleed photo with dark overlay, text centered at bottom"
  - "White background, centered headline + subtitle + two CTA buttons, no image"
  Be SPECIFIC — not "big hero" but the exact structure.
• NAVIGATION: Exact nav layout. E.g. "Logo left, links center, two buttons (Login + CTA) right"
• SECTION FLOW: List the sections top to bottom and their layout. E.g.:
  1. Hero: full-width teal block, centered search
  2. Category icons: horizontal scrollable row
  3. Featured listings: horizontal card scroll
  4. Location cards: 4-column grid
• CONTENT PATTERNS: Cards with photos? List rows? Tiles? Masonry?

═══════════════════════════════════════════════════
STEP 2 — GENERATE THE WEBSITE
═══════════════════════════════════════════════════
Using ONLY the visual language extracted above (zero templates, zero assumptions), generate a complete single-file HTML website for this business.

BUSINESS DETAILS:
- Name: ${details.name}
- Category: ${details.category ?? "Local Business"}
- Address: ${details.address ?? "Not provided"}
- Phone: ${details.phone ?? "Not provided"}
- Rating: ${details.rating ?? "N/A"}/5 (${details.reviewCount ?? 0} reviews)
${details.description ? `- Description: ${details.description}` : ""}

OPENING HOURS:
${hoursBlock}

REAL CUSTOMER REVIEWS (use verbatim — do NOT invent fake reviews):
${reviewsBlock}
${reviewAnalysis ? `\nREVIEW ANALYSIS (use for authentic copy):\n${reviewAnalysis}` : ""}
${photosBlock ? `\nBUSINESS PHOTOS (embed as <img> tags):\n${photosBlock}` : ""}

═══════════════════════════════════════════════════
LAYOUT RULES (most critical — enforce without exception):
1. The HERO must use the EXACT same structural pattern as the reference hero — not a similar one, the SAME one.
   • If reference hero is a full-width color block with centered text + search bar → use that. No photo. No split layout.
   • If reference hero is a left-text/right-image split → use that. No full-width block.
   • If reference hero is full-bleed photo with overlay → use that. No color block.
2. FORBIDDEN unless found in the reference:
   • Generic "left text column + right image" hero split
   • 3-column service card grid as the primary content pattern
   • Rigid Hero → About → Services → Testimonials → Contact sequence
3. The NAV must match the reference nav structure exactly (link positions, button placement).
4. The SECTION FLOW must follow the reference top-to-bottom order, not a generic template.
5. Every layout decision must trace back to a specific observation from Step 1.

DESIGN RULES (non-negotiable):
1. The site must be indistinguishable from a sibling of the reference sites — same color DNA, same typographic scale, same corner radius, same shadow depth.
2. DO NOT use generic SaaS/corporate styling. Mirror the references exactly.
3. Define ALL colors as CSS custom properties in :root {}. No hardcoded hex values outside :root.

TECHNICAL REQUIREMENTS:
1. Return ONLY the complete HTML — start with <!DOCTYPE html>, end with </html>. No markdown fences.
2. All CSS in one <style> tag. Use CSS custom properties (--clr-bg, --clr-primary, --radius, etc.) derived from the reference analysis.
3. Icons: Lucide. Load via <script src="https://unpkg.com/lucide@latest"></script>. Use <i data-lucide="..."></i>. Init with <script>lucide.createIcons();</script> before </body>.
4. Load Google Fonts via <link>. Choose typefaces that match the reference font aesthetic.
5. Fully responsive — mobile-first (375px, 768px, 1280px breakpoints).
6. Scroll-triggered fade-up via Intersection Observer + CSS @keyframes.
7. Embed this JSON-LD verbatim inside <head>:
${jsonLd}
8. Semantic HTML5, single <h1>, ARIA labels on interactive elements.
9. Sticky or prominent "Call Now" button if phone is available.
${details.googleMapsUrl ? `10. "Get Directions" link: ${details.googleMapsUrl}` : "10. Add a Google Maps embed using the address."}
11. ${details.photos.length > 0 ? "Use provided business photos. loading='lazy', object-fit:cover." : "No placeholder images — use CSS gradients or shapes."}
12. Footer: business name, address, phone, copyright 2025.
13. Every major <section> (plus <header>, <nav>, <footer>) MUST have a data-section-type attribute (e.g. "hero", "about", "services", "testimonials", "contact", "footer").
${logoBase64 ? `\nLOGO: Use this exact placeholder in the <img> src for the logo AND favicon:\n<img src="data:image/png;base64,{{LOGO_DATA}}" alt="${details.name} logo" class="logo" />\n<link rel="icon" type="image/png" href="data:image/png;base64,{{LOGO_DATA}}" />` : ""}
${heroBase64 ? `\nHERO IMAGE: Use this exact placeholder for the hero/main image:\n<img src="data:image/png;base64,{{HERO_DATA}}" alt="${details.name}" loading="lazy" />` : ""}`;

  return streamGeminiHtml(prompt, true);
}

/**
 * Core Gemini 3.1 Pro streaming function for HTML generation.
 * useUrlContext=true enables URL grounding (for reference analysis).
 * useUrlContext=false is used for template-based generation without references.
 */
export async function streamGeminiHtml(
  prompt: string,
  useUrlContext = false,
): Promise<AsyncGenerator<string> | null> {
  const client = getGemini();
  if (!client) return null;

  const openStream = () =>
    client.models.generateContentStream({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        ...(useUrlContext ? { tools: [{ urlContext: {} }] } : {}),
        temperature: 0.4,
        maxOutputTokens: 65536,
      },
    });

  try {
    // Retry stream opening — 503s happen when the Promise resolves, before chunks start.
    // 4 retries: 3s → 6s → 12s → 24s backoff.
    const resolved = await retry(() => openStream(), 4, 3000);

    async function* textChunks(): AsyncGenerator<string> {
      for await (const chunk of resolved) {
        const text = chunk.text;
        if (text) yield text;
      }
    }

    return textChunks();
  } catch (err) {
    console.error("[Gemini] streamGeminiHtml failed after retries:", err);
    return null;
  }
}
