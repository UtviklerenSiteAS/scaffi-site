import { generateWebsiteSchema } from "@/lib/validations/website";
import { getPlaceDetails, type PlaceDetails } from "@/lib/maps";
import { anthropic } from "@/lib/claude";
import { generateLogo, generateHeroImage, generateHtmlFromReferences, streamGeminiHtml } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkWebsiteLimit } from "@/lib/subscription";

// ─── Style Instructions ───────────────────────────────────────────────────────
const STYLE_INSTRUCTIONS: Record<string, string> = {
  "corporate-clean": `Design a professional corporate website inspired by top SaaS landing pages:
- Hero: Full-width with a large headline (48-64px), subtitle, and TWO CTA buttons side by side (one filled, one outlined)
- Stats bar: A row of 3-4 large numbers (e.g. "6 mil", "315", "120K") with small labels below, on a slightly darker background
- Trust section: "Trusted by" logos row with grayscale company logos
- Services: 3-column grid of cards with small colored icons, title, and 2-line description
- Testimonial: Large quote with customer photo, name, and title, in a subtle card
- Color: White background (#FFFFFF), dark text (#1A1A2E), ONE accent color (green #10B981 or blue #3B82F6) for CTAs and highlights
- Typography: Clean sans-serif (Inter/system-ui), generous line-height (1.6), sections separated by 80-120px vertical spacing
- Footer: 4-column grid with links, plus bottom bar with copyright`,

  "bold-dark": `Design a bold, high-impact dark-themed website:
- Hero: Dark background (#0A0A0F) with a massive headline (56-72px) using font-weight 800, with gradient text effect (purple-to-pink or cyan-to-blue)
- Feature pills: Horizontal row of rounded pill badges showing key metrics
- Services: Cards with dark backgrounds (#111118), subtle border (1px rgba(255,255,255,0.08)), and a colored top border accent (3px)
- Pricing or CTA: Full-width gradient section with large centered text and glowing button
- Color: Background #0A0A0F, cards #111118, text #E4E4E7, accent gradient from #8B5CF6 to #EC4899
- Typography: Bold sans-serif, uppercase section labels with letter-spacing: 0.1em, large size contrast between headings and body
- Effects: Subtle box-shadow glow on hover (0 0 30px rgba(139,92,246,0.15)), smooth transitions`,

  "warm-organic": `Design a warm, inviting website with organic feel:
- Hero: Warm off-white background (#FBF7F4) with a friendly headline, rounded CTA button, and a large photo with rounded corners (border-radius: 20px)
- Features: Alternating left-right layout — image on one side, text on other, with generous padding
- Cards: Soft shadows (0 4px 24px rgba(0,0,0,0.06)), rounded corners (16px), cream/beige card backgrounds
- Color: Background #FBF7F4, cards #FFFFFF, text #3D3529, accent warm terracotta (#C67A4B) or sage green (#7C9070)
- Typography: Mix of serif for headings (Georgia or similar) and sans-serif for body. Headings 36-48px, relaxed feel
- Decorative: Subtle organic shapes or soft curved dividers between sections. No harsh lines
- CTA: Rounded buttons (border-radius: 50px) with warm accent color`,

  "glass-modern": `Design a futuristic glass-morphism website:
- Hero: Deep gradient background (dark blue #0F172A to purple #1E1B4B), frosted glass card overlay with backdrop-filter: blur(16px) and white border (1px rgba(255,255,255,0.1))
- Feature cards: Glass effect — background: rgba(255,255,255,0.05), backdrop-filter: blur(12px), border: 1px solid rgba(255,255,255,0.1)
- Stats: Glowing numbers with text-shadow and subtle animation hints
- Color: Background gradient #0F172A→#1E1B4B, glass cards, text white/zinc-100, accent cyan #06B6D4 or violet #8B5CF6
- Typography: Modern geometric sans-serif, thin weight for large headings (font-weight: 300, 48-64px) with normal weight body
- Effects: Glass cards, subtle gradient borders, hover scale(1.02) transitions
- Layout: Centered content (max-width: 1200px), 2-3 column grids, generous 100px section spacing`,

  "editorial": `Design a magazine-style editorial website:
- Hero: Asymmetric layout — large serif headline on left (56-72px, font-weight: 700) with body text, large image on right taking 50-60% width
- Sections: Alternating full-width images with overlapping text cards positioned with negative margin
- Grid: Masonry-like grid for portfolio/work section — mix of large and small cards
- Color: Clean white (#FFFFFF), pure black text (#000000), ONE accent color (red #DC2626 or emerald #059669) used sparingly for links and buttons only
- Typography: Serif for all headings (Georgia, "Times New Roman"), sans-serif for body. Strong size hierarchy: 72px h1, 36px h2, 16px body
- Layout: Full-bleed images, narrow text columns (max-width: 680px), dramatic whitespace
- Details: Thin horizontal rules between sections, small caps for labels, numbered list items with oversized numbers`,

  "startup-energy": `Design an energetic startup website inspired by clean-tech companies:
- Hero: White/light gray background with bold headline, green accent color, TWO buttons, and stat badges (rounded pills showing "6 mil+" "315 projects" etc.)
- Partner logos: Grayscale logo bar with 5-6 logos
- Features: 3x2 grid of feature cards with small colored square icons (8x8px rounded), title, and description
- Product showcase: Left-right split — text with numbered list items on left ("01", "02", "03" with titles and "View Details" links), large image on right
- Testimonial: Card with company name, large quote, photo, reviewer name/title, and category tabs below
- CTA band: Full-width colored section with bold text and action button
- Color: White #FFFFFF, light gray #F9FAFB for alternating sections, green #10B981 for CTAs/accents, dark text #111827
- Typography: Clean sans-serif, bold headings (700), normal body, italic for decorative subheadings`,

  restaurant: `Design a restaurant website with focus on food and atmosphere:
- Hero: Full-width food/interior photo as background with dark overlay (rgba(0,0,0,0.5)), white text, restaurant name large, tagline, and "Se menyen" + "Bestill bord" buttons
- Menu section: Clean categorized menu with item name, description, and price. Use a 2-column layout
- About: Side-by-side — atmospheric photo and text about the restaurant history
- Hours & Location: Card with opening hours table and embedded map placeholder
- Color: Dark charcoal #1C1917, warm cream #FEF3C7 accents, rich burgundy #991B1B or olive #4D5B2E
- Typography: Elegant serif for restaurant name and headings, clean sans-serif for menu items and body text`,

  salon: `Design a beauty salon website with elegance and booking focus:
- Hero: Soft gradient or muted photo background, elegant headline, "Book time" prominent CTA button
- Services: Grid of service cards with name, duration, price, and small "Book" button each
- Gallery: 3-column image grid with subtle hover zoom effect
- Pricing: Clean price table with service categories, descriptions, and prices aligned right
- Color: Soft blush pink #FDF2F8, white, dark text #1F2937, accent rose gold #B76E79 or mauve #9F7AEA
- Typography: Elegant thin sans-serif or light serif for headings, generous letter-spacing`,

  tradesperson: `Design a trustworthy tradesperson/contractor website:
- Hero: Strong headline about reliability, photo of work in progress, "Få gratis befaring" CTA button with phone number visible
- Trust badges: Row of certification/insurance badges and "X års erfaring"
- Services: Icon-grid of services offered (4-6 items) with clear descriptions
- Before/After: Side-by-side project showcase cards
- Reviews: Customer testimonial cards with star ratings, names, and dates
- Contact: Prominent contact section with phone, email, and simple form
- Color: Navy #1E3A5F or forest green #166534, white background, orange/amber #F59E0B for CTAs
- Typography: Strong, readable sans-serif. Bold headings conveying reliability`,

  clinic: `Design a clean medical/health clinic website:
- Hero: Calming blue or teal gradient, headline about patient care, "Bestill time" button, professional photo
- Services: Clean list or grid of medical services with medical icons
- Team: Doctor/staff cards with photo, name, title, and specialization
- Trust: Certifications, patient count stats, partner logos
- Booking CTA: Prominent mid-page section encouraging appointment booking
- Color: Calming blue #0EA5E9 or teal #14B8A6, white background #FFFFFF, light blue #F0F9FF for alternating sections, dark text #0F172A
- Typography: Clean, professional sans-serif. Medium weight headings, high readability body text with 1.7 line-height`,
};

// ─── Industry-specific section builders ──────────────────────────────────────
function getIndustrySections(category: string | null): string {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("bakery") || cat.includes("pizza") || cat.includes("bistro")) {
    return `INDUSTRY-SPECIFIC SECTIONS for Restaurant/Café:
- Add a "Meny" or "Menu Highlights" section with 4–6 sample dishes presented as attractive menu cards (name, short description, price placeholder like "fra 149,-"). Use food emojis or CSS shapes.
- Add a reservation/booking CTA: "Bestill bord" or "Book a Table" button that links to tel: or mailto:.
- Hero background should feel warm and appetizing (dark overlay on food imagery or warm amber/terracotta tones if no photos).`;
  }
  if (cat.includes("frisør") || cat.includes("hair") || cat.includes("salong") || cat.includes("barber") || cat.includes("salon")) {
    return `INDUSTRY-SPECIFIC SECTIONS for Hair/Beauty Salon:
- Add a "Tjenester & Priser" section with service cards: Haircut, Color, Highlights, Treatment, etc. with price placeholders.
- Add a prominent "Bestill time" (Book Appointment) CTA button — the most important conversion action.
- Style: clean, premium, fashion-forward. Use a monochromatic or muted palette with one warm accent.`;
  }
  if (cat.includes("tannlege") || cat.includes("dental") || cat.includes("tann")) {
    return `INDUSTRY-SPECIFIC SECTIONS for Dental Clinic:
- Add a "Behandlinger" (Treatments) section: checkups, whitening, braces, implants.
- Add a trust-building "Forsikring" note: mention that common insurance/trygde plans are accepted.
- Tone: Clean, clinical, trustworthy. Whites and blues.`;
  }
  if (cat.includes("elektriker") || cat.includes("electric") || cat.includes("rørlegger") || cat.includes("plumber") || cat.includes("håndverker")) {
    return `INDUSTRY-SPECIFIC SECTIONS for Trades (Electrician/Plumber):
- Add a BRIGHT red/orange "Nødhjelp 24/7" (Emergency Service) banner at the very TOP of the page, above the hero. It should be visually impossible to miss. Include the phone number.
- Add a "Sertifiseringer & Godkjenninger" (Certifications) section with badge-style elements.
- Add a "Tjenester" section listing specific trade services as a clean checklist/grid.`;
  }
  if (cat.includes("treningssenter") || cat.includes("gym") || cat.includes("fitness")) {
    return `INDUSTRY-SPECIFIC SECTIONS for Gym/Fitness:
- Add a "Priser & Medlemskap" section with 3 membership tier cards (monthly, 3-month, annual) in a pricing table format.
- Add "Klasser & Aktiviteter" section listing group classes.
- Hero should feel energetic and motivating. Dark background, bold typography, high-energy colors (orange, red, electric blue).`;
  }
  return `GENERAL BUSINESS SECTIONS:
- Include: Hero, About/Story, Services (with 4–6 service cards), Testimonials (from the reviews), Hours, Contact, Footer.
- Make the services section visually rich, not just a plain list.`;
}

// ─── JSON-LD Schema Builder ───────────────────────────────────────────────────
function buildJsonLd(details: PlaceDetails): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: details.name,
    ...(details.address ? { address: { "@type": "PostalAddress", streetAddress: details.address } } : {}),
    ...(details.phone ? { telephone: details.phone } : {}),
    ...(details.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: details.rating, reviewCount: details.reviewCount ?? 1 } } : {}),
    ...(details.category ? { "@type": details.category } : {}),
    ...(details.googleMapsUrl ? { hasMap: details.googleMapsUrl } : {}),
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

// ─── Reference Design Analyzer (Vision → CSS variables) ──────────────────────
// Uses Claude Haiku Vision on a screenshot thumbnail to extract the exact
// CSS custom properties of the reference site. Output is machine-readable
// CSS variable declarations that get pasted verbatim into the :root {} block.
async function analyzeReferenceDesign(url: string): Promise<string> {
  try {
    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/800/${url}`;
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: screenshotUrl } },
          {
            type: "text",
            text: `Look at this website screenshot carefully. Output EXACTLY these 16 lines — nothing else, no explanations:
--clr-bg: #______
--clr-surface: #______
--clr-primary: #______
--clr-text: #______
--clr-heading: #______
--clr-cta: #______
--clr-cta-text: #______
--radius-btn: ___px
--radius-card: ___px
--font-heading: ______
--spacing: ______
--mood: ______
--hero-type: ______
--hero-bg: ______
--nav-style: ______
--section-pattern: ______

Color rules: real hex codes. --radius-btn: 0=sharp, 4-8=subtle, 50=pill. --font-heading: e.g. "bold sans-serif". --spacing: tight/balanced/airy. --mood: 3 words.
Layout rules:
  --hero-type: describe EXACTLY what the hero looks like. Options: "full-width-color-block centered text + search bar", "left-text right-image split", "centered headline + two CTA buttons", "full-bleed photo with overlay text", "editorial asymmetric", etc. Be specific.
  --hero-bg: "solid color", "gradient", "photo with overlay", "white/light"
  --nav-style: "horizontal links + CTA button right", "logo only + hamburger", "logo center links spread", etc.
  --section-pattern: describe the dominant section layout. E.g. "full-width colored blocks stacked", "2-col alternating text+image", "3-col card grid", "single-col editorial", etc.`,
          },
        ],
      }],
    });
    const textBlock = res.content.find((b) => b.type === "text");
    const cssVars = textBlock?.type === "text" ? textBlock.text.trim() : "";
    return `/* Reference: ${url} */\n${cssVars}`;
  } catch {
    return `/* Reference: ${url} — analysis unavailable */`;
  }
}

// ─── Reference-specific prompt builder ────────────────────────────────────────
// Completely separate from buildPrompt() — no industry sections, no template
// overrides. The CSS variables from analyzeReferenceDesign() are MANDATORY.
function buildReferencePrompt(
  details: PlaceDetails,
  cssVarsBlock: string,
  logoBase64: string | null,
  heroBase64: string | null,
  reviewAnalysis: string | null,
): string {
  const hoursBlock = details.hours ? details.hours.join("\n") : "Not available.";
  const reviewsBlock = details.reviews && details.reviews.length > 0
    ? details.reviews.slice(0, 5)
        .map((r) => `- ${r.author} (${r.rating}/5): "${r.text.slice(0, 250)}"`)
        .join("\n")
    : "No reviews.";
  const photosBlock = details.photos.length > 0
    ? details.photos.map((u, i) => `Photo ${i + 1}: ${u}`).join("\n")
    : "";
  const jsonLd = buildJsonLd(details);

  return `You are a world-class frontend developer. Generate a complete single-file HTML website.

══════════════════════════════════════════════════════
MANDATORY DESIGN SYSTEM — COPY THESE INTO :root {} VERBATIM
══════════════════════════════════════════════════════
${cssVarsBlock}

COLOR ENFORCEMENT (no exceptions):
• --clr-bg is the ONLY permitted background on <body>/<main>
• --clr-cta is the ONLY permitted button background — never use blue unless --clr-cta is blue
• --clr-primary is the ONLY accent/brand color
• border-radius on buttons = --radius-btn exactly
• border-radius on cards = --radius-card exactly
• No color may appear in CSS that is not defined in :root {}

LAYOUT ENFORCEMENT (this is the most critical section):
• The hero MUST be built as described in --hero-type. Do not substitute a different hero pattern.
• If --hero-type says "full-width-color-block", the hero background must be a solid colored block spanning 100% width, NOT a split layout.
• If --hero-type says "left-text right-image split", use that. If not, do NOT use that pattern.
• If --hero-bg says "solid color", use var(--clr-primary) or var(--clr-bg) as background. No photos unless --hero-bg says "photo".
• The nav MUST match --nav-style exactly.
• Sections MUST follow --section-pattern. If it says "full-width colored blocks stacked", do NOT use card grids.
• FORBIDDEN UNLESS EXPLICITLY IN --hero-type: the generic "left text + right photo" hero split.
• FORBIDDEN UNLESS EXPLICITLY IN --section-pattern: 3-column service card grids.
• Build only the sections that make sense for the business. Do NOT hardcode a fixed Hero→About→Services→Testimonials→Footer sequence if the reference uses a different structure.
══════════════════════════════════════════════════════

BUSINESS:
- Name: ${details.name}
- Category: ${details.category ?? "Local Business"}
- Address: ${details.address ?? "Not provided"}
- Phone: ${details.phone ?? "Not provided"}
- Rating: ${details.rating ?? "N/A"}/5 (${details.reviewCount ?? 0} reviews)
${details.description ? `- About: ${details.description}` : ""}

HOURS:
${hoursBlock}

CUSTOMER REVIEWS (use verbatim, do not invent):
${reviewsBlock}
${reviewAnalysis ? `\nREVIEW INSIGHTS:\n${reviewAnalysis}` : ""}
${photosBlock ? `\nBUSINESS PHOTOS (use as <img> tags):\n${photosBlock}` : ""}

SECTIONS: Build sections appropriate for the business type and matching the --section-pattern from the reference. Include contact info, hours, and relevant business content. Do NOT follow a rigid template.

TECHNICAL:
1. Return ONLY complete HTML: <!DOCTYPE html> … </html>. No markdown.
2. All CSS in one <style> tag. Start :root {} with the MANDATORY variables above, then build the rest of the design from them.
3. Lucide icons: <script src="https://unpkg.com/lucide@latest"></script> + <script>lucide.createIcons();</script> before </body>.
4. Google Fonts via <link>. Match the --font-heading style.
5. Mobile-first responsive (375px, 768px, 1280px).
6. Scroll fade-up via Intersection Observer + @keyframes.
7. Embed in <head>: ${jsonLd}
8. Semantic HTML5, one <h1>, ARIA labels.
9. Sticky "Call Now" button if phone is available.
10. ${details.photos.length > 0 ? "Use provided photos. loading='lazy', object-fit:cover." : "No placeholder images — use CSS gradients."}
11. Footer: name, address, phone, copyright 2025.
12. Every section must have data-section-type attribute.
${logoBase64 ? `\nLOGO placeholder: <img src="data:image/png;base64,{{LOGO_DATA}}" alt="${details.name} logo" class="logo" />\nFavicon: <link rel="icon" type="image/png" href="data:image/png;base64,{{LOGO_DATA}}" />` : ""}
${heroBase64 ? `\nHERO IMAGE placeholder: <img src="data:image/png;base64,{{HERO_DATA}}" alt="${details.name}" loading="lazy" />` : ""}`;
}

// ─── Claude Opus fallback streamer ───────────────────────────────────────────
async function* streamClaudeHtml(prompt: string): AsyncGenerator<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 32000,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });
  for await (const event of response) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

// ─── Limit Review Count to Save Tokens ────────────────────────────────────────
function formatReviews(reviews: any[] | null): string {
  if (!reviews || reviews.length === 0) return "No reviews available.";
  // Only take top 5 reviews and truncate long texts
  return reviews
    .slice(0, 5)
    .map((r) => `- ${r.author} (${r.rating}/5): "${r.text.length > 300 ? r.text.slice(0, 300) + "..." : r.text}"`)
    .join("\n");
}



// ─── Review Sentiment Analysis ───────────────────────────────────────────────
async function analyzeReviews(details: PlaceDetails): Promise<string | null> {
  if (!details.reviews || details.reviews.length === 0) return null;

  try {
    const reviewsText = details.reviews
      .map((r) => `${r.author} (${r.rating}/5): "${r.text}"`)
      .join("\n");

    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Analyze these customer reviews for "${details.name}" (a ${details.category ?? "local business"}). Return a JSON object with:
- "loved": array of 3 things customers love most
- "popular": array of 2-3 popular products/services mentioned
- "usps": array of 2-3 unique selling points that differentiate this business
- "tone": one word describing the overall customer sentiment (e.g. "enthusiastic", "satisfied", "impressed")
- "aboutText": a 2-sentence "About" paragraph written from the business perspective, based on what customers actually say (not generic marketing fluff)

Reviews:
${reviewsText}

Return ONLY valid JSON, no markdown.`,
        },
      ],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    return textBlock.text;
  } catch (err) {
    console.error("Review analysis failed:", err);
    return null;
  }
}

// ─── Competitor Differentiation ──────────────────────────────────────────────
async function findCompetitorInsights(
  details: PlaceDetails
): Promise<string | null> {
  if (!details.rating || !details.address) return null;

  // Build a differentiation statement based on available data
  const strengths: string[] = [];

  if (details.rating >= 4.5) {
    strengths.push(
      `Top-rated with ${details.rating}/5 stars from ${details.reviewCount ?? 0} reviews`
    );
  } else if (details.rating >= 4.0) {
    strengths.push(
      `Highly rated at ${details.rating}/5 from ${details.reviewCount ?? 0} reviews`
    );
  }

  if (details.reviewCount && details.reviewCount > 100) {
    strengths.push(`One of the most reviewed in the area with ${details.reviewCount}+ reviews`);
  }

  if (details.hours && details.hours.length > 0) {
    const hasWeekend = details.hours.some(
      (h) => (h.toLowerCase().includes("saturday") || h.toLowerCase().includes("sunday") ||
        h.toLowerCase().includes("lørdag") || h.toLowerCase().includes("søndag")) &&
        !h.toLowerCase().includes("closed") && !h.toLowerCase().includes("stengt")
    );
    if (hasWeekend) strengths.push("Open on weekends — convenient hours");
  }

  if (details.priceLevel === "PRICE_LEVEL_INEXPENSIVE" || details.priceLevel === "PRICE_LEVEL_MODERATE") {
    strengths.push("Competitively priced for the quality offered");
  }

  return strengths.length > 0
    ? `COMPETITIVE ADVANTAGES (use these to craft compelling copy):\n- ${strengths.join("\n- ")}`
    : null;
}

// ─── Main Prompt Builder ──────────────────────────────────────────────────────
function buildPrompt(
  details: PlaceDetails,
  templateStyle?: string,
  templateCategory?: string,
  referenceSummaries?: string[],
  logoBase64?: string | null,
  heroBase64?: string | null,
  reviewAnalysis?: string | null,
  competitorInsights?: string | null,
): string {
  const reviewsBlock = formatReviews(details.reviews);

  const hoursBlock = details.hours ? details.hours.join("\n") : "Hours not available.";

  const photosBlock =
    details.photos.length > 0
      ? details.photos.map((url, i) => `Photo ${i + 1}: ${url}`).join("\n")
      : "";

  const priceLevelMap: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };

  const hasReferences = referenceSummaries && referenceSummaries.length > 0;
  const referencesText = hasReferences
    ? referenceSummaries!.join("\n\n")
    : "";

  const industrySections = getIndustrySections(details.category ?? templateCategory ?? null);
  const jsonLd = buildJsonLd(details);

  return `You are a senior front-end developer and award-winning web designer. Generate a complete, single-file HTML website. Every detail must be intentional and technically precise — make sure it doesn't look "vibe coded" or AI-generated.

${hasReferences ? `
═══════════════════════════════════════════════════
CRITICAL: REFERENCE SITE DESIGN SYSTEM
═══════════════════════════════════════════════════
The following is a pre-analyzed visual design spec extracted from the reference sites.
Mirror these EXACTLY — no generic SaaS styling, no assumptions:
1. COLORS: Use the EXACT hex values from the analysis below.
2. TYPOGRAPHY: Match font families and weights precisely.
3. GEOMETRY: Replicate border-radius (e.g., sharp=0px, pill=50px).
4. SHADOWS: Match depth and style exactly.
5. SPACING: Match section padding/margin density.
6. THE RESULT MUST LOOK LIKE A SIBLING SITE OF THE REFERENCE.

REFERENCE DESIGN ANALYSIS:
${referencesText}
═══════════════════════════════════════════════════
` : `${templateStyle && STYLE_INSTRUCTIONS[templateStyle] ? `\nDESIGN STYLE:\n${STYLE_INSTRUCTIONS[templateStyle]}\n` : "The website must be production-ready, mobile-responsive, and visually stunning."}`}

BUSINESS DETAILS:
- Name: ${details.name}
- Category: ${details.category ?? "Local Business"}
- Address: ${details.address ?? "Not provided"}
- Phone: ${details.phone ?? "Not provided"}
- Rating: ${details.rating ?? "N/A"}/5 (${details.reviewCount ?? 0} reviews)
- Description: ${details.description ?? "A local business serving the community."}
${details.priceLevel ? `- Price Level: ${priceLevelMap[details.priceLevel] ?? details.priceLevel}` : ""}
${details.googleMapsUrl ? `- Google Maps: ${details.googleMapsUrl}` : ""}

OPERATING HOURS:
${hoursBlock}

CUSTOMER REVIEWS (use these for real testimonial text — do NOT make up fake reviews):
${reviewsBlock}
${reviewAnalysis ? `
REVIEW SENTIMENT ANALYSIS (use this to write authentic About text and highlight real strengths):
${reviewAnalysis}
` : ""}
${competitorInsights ? `
${competitorInsights}
` : ""}
${photosBlock ? `\nBUSINESS PHOTOS — embed as <img> tags, use in hero, gallery, about:\n${photosBlock}` : ""}

═══════════════════════════════════════════════════
INDUSTRY-SPECIFIC LAYOUT REQUIREMENTS:
${industrySections}
${templateCategory && !hasReferences ? `\nINDUSTRY CONTEXT: This is a ${templateCategory} business. Apply industry-specific design conventions.` : ""}
═══════════════════════════════════════════════════

${logoBase64 ? `
AI-GENERATED LOGO:
A custom logo has been generated. Use this placeholder exactly in your HTML for the logo src:
<img src="data:image/png;base64,{{LOGO_DATA}}" alt="${details.name} logo" class="logo" />
Use it in the navbar/header AND as the favicon:
<link rel="icon" type="image/png" href="data:image/png;base64,{{LOGO_DATA}}" />
` : ""}
${heroBase64 ? `
AI-GENERATED HERO IMAGE:
A custom hero photograph has been generated. Use this placeholder exactly in your HTML for the hero/main image src:
<img src="data:image/png;base64,{{HERO_DATA}}" alt="${details.name}" loading="lazy" />
` : ""}

TECHNICAL REQUIREMENTS:
1. Return ONLY the complete HTML — starting with <!DOCTYPE html>, ending with </html>. No markdown fences.
2. All CSS must be in a single <style> tag in <head>. Use CSS custom properties (--color-primary, --radius-card, etc.) for maintainability.
3. ${hasReferences ? "Match the reference colors, fonts, radii, and shadows exactly. Analyze the visual styles of the reference sites provided." : `Professional color palette for a "${details.category ?? "business"}".`}
4. Icons: Use Lucide icons. Load the library in <head> via: <script src="https://unpkg.com/lucide@latest"></script>. Initialize it with <script>lucide.createIcons();</script> just before the closing </body> tag. Use <i data-lucide="..."></i> for all icons.
5. Must be fully responsive (mobile-first). Test mentally for 375px, 768px, 1280px.
6. Load Google Fonts via <link> tag. Choose typefaces appropriate for the industry.
7. Include subtle CSS scroll animations using @keyframes + animation-fill-mode.
8. Include a JavaScript Intersection Observer to trigger "fade-up" class on sections as they scroll into view.
9. Embed this JSON-LD <script> block verbatim inside the <head> tag:
${jsonLd}
10. Semantic HTML5. Proper heading hierarchy (only one <h1>). ARIA labels on interactive elements.
11. If phone is available: a sticky or prominent "Call Now" CTA button.
12. ${details.googleMapsUrl ? `"Get Directions" link: ${details.googleMapsUrl}` : "Add a simple Google Maps embed using the address."}
13. ${details.photos.length > 0 ? "Use the provided business photos. loading='lazy', object-fit: cover. Add a CSS fallback background-color." : "NO placeholder images. Use CSS gradients, geometric shapes, or text-based visuals."}
14. Footer must include: business name, address, phone, copyright year (2025), and links to sections.
15. STRATEGIC UX: Use modern patterns like "sticky headers", "glassmorphism", and "scroll-triggered reveal" to make the site feel premium.
16. CONVERSION FOCUS: Ensure the "Call Now" or "Book Appointment" buttons are the most visually distinct elements on the page.
17. IMPORTANT: Every major <section> (and the <header>, <nav>, <footer>) MUST have a data-section-type attribute describing its role. Use values like: "hero", "about", "services", "menu", "pricing", "testimonials", "hours", "contact", "gallery", "team", "cta", "emergency-banner", "certifications", "footer", "nav". This is required for the section editor.
18. TOKEN BUDGET: Keep CSS concise — use shorthand properties, combine similar selectors, avoid redundant declarations. Prioritize generating complete HTML body content over verbose CSS. The page MUST have visible content in <body>. Generate the HTML structure FIRST, then style it. Do NOT spend excessive tokens on CSS at the expense of missing body content.`;
}

// ─── Streaming POST Handler ───────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(
      JSON.stringify({ error: "Authentication required", code: "UNAUTHORIZED" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });

  const canGenerate = await checkWebsiteLimit(session.user.id, dbUser?.subscriptionTier ?? "FREE", session.user.email);
  if (!canGenerate) {
    return new Response(
      JSON.stringify({ error: "Website limit reached. Upgrade to Pro for unlimited websites.", code: "LIMIT_EXCEEDED" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const parsed = generateWebsiteSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const details = await getPlaceDetails(parsed.data.placeId);

    const hasReferences = !!(parsed.data.referenceUrls && parsed.data.referenceUrls.length > 0);

    // Parallel pre-generation tasks
    const [logoBase64, heroBase64, reviewAnalysis, competitorInsights] = await Promise.all([
      generateLogo(details.name, details.category),
      details.photos.length === 0
        ? generateHeroImage(details.name, details.category)
        : Promise.resolve(null),
      analyzeReviews(details),
      findCompetitorInsights(details),
    ]);

    // ── Stream the response ──────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        console.log(`[SSE] Starting stream for: "${details.name}" (mode: ${hasReferences ? "Gemini+References" : "Claude+Template"})`);
        const sendStatus = (label: string) => {
          console.log(`[SSE Status] ${label}`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", label })}\n\n`));
        };

        // Send business details and generated assets to the client first
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "details",
              details: {
                name: details.name,
                address: details.address,
                phone: details.phone,
                rating: details.rating,
                category: details.category,
                hours: details.hours ? JSON.stringify(details.hours) : null,
                logo: logoBase64,
                hero: heroBase64,
              },
            })}\n\n`
          )
        );

        if (logoBase64) sendStatus("🎨 Logo generated");
        if (heroBase64) sendStatus("📸 Hero image created");
        if (reviewAnalysis) sendStatus("📊 Reviews analyzed");

        // ── Path A: Gemini + Reference URLs ───────────────────────────────────
        if (hasReferences) {
          sendStatus("🔍 Analyzing reference sites with Gemini...");

          const jsonLd = buildJsonLd(details);
          const geminiStream = await generateHtmlFromReferences(
            parsed.data.referenceUrls!,
            details,
            logoBase64,
            heroBase64,
            reviewAnalysis ?? null,
            jsonLd,
          );

          sendStatus("🚀 Generating website from references...");

          let htmlSource: AsyncGenerator<string>;
          if (geminiStream) {
            htmlSource = geminiStream;
          } else {
            sendStatus("⚠️ Gemini unavailable — analyzing references visually...");
            const refSpecs = await Promise.all(
              parsed.data.referenceUrls!.map(analyzeReferenceDesign)
            );
            // Merge CSS variable blocks from all reference URLs
            const cssVarsBlock = refSpecs.join("\n\n");
            const refPrompt = buildReferencePrompt(
              details,
              cssVarsBlock,
              logoBase64,
              heroBase64,
              reviewAnalysis ?? null,
            );
            htmlSource = streamClaudeHtml(refPrompt);
          }

          try {
            let chunkCount = 0;
            for await (const text of htmlSource) {
              chunkCount++;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`));
            }
            console.log(`[SSE] Stream finished (references). Chunks: ${chunkCount}`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Stream error";
            console.error("[SSE Error] Reference stream failed:", err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`));
          }

        // ── Path B: Gemini 3.1 Pro + Template (no references) ────────────────
        } else {
          const prompt = buildPrompt(
            details,
            parsed.data.templateStyle,
            parsed.data.templateCategory,
            undefined,
            logoBase64,
            heroBase64,
            reviewAnalysis,
            competitorInsights,
          );

          console.log(`[DEBUG] Prompt length: ${prompt.length}`);

          sendStatus("🚀 Generating website with Gemini...");

          const geminiStream = await streamGeminiHtml(prompt, false);
          const htmlSource = geminiStream ?? streamClaudeHtml(prompt);
          if (!geminiStream) sendStatus("⚠️ Gemini unavailable, using Claude fallback...");

          try {
            let chunkCount = 0;
            for await (const text of htmlSource) {
              chunkCount++;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`));
            }
            console.log(`[SSE] Stream finished (template). Chunks: ${chunkCount}`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Stream error";
            console.error("[SSE Error] Template stream failed:", err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Website generation failed";
    console.error("Website generation error:", err);
    return new Response(
      JSON.stringify({ error: errorMessage, code: "GENERATION_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
