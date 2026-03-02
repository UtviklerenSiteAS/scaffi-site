"use client"
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { DeployButton } from "@/components/websites/deploy-button";
import { DomainManager } from "@/components/websites/domain-manager";

import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Globe,
  Link2,
  Monitor,
  Palette,
  Plus,
  Smartphone,
  Sparkles,
  Loader2,
  Tablet,
  Trash2,
  X,
  Calendar,
  CreditCard,
  MessageCircle,
  ShoppingBag,
  Users,
  Map,
  Tag,
  ChevronRight,
  Calculator,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComponentRecommendation = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  addedValue: number;
};

type Prospect = {
  id: string;
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  status: string;
};

type GenerationDetails = {
  name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  category: string | null;
  hours: string | null;
  logo?: string | null;
  hero?: string | null;
};

type GenerationStep = {
  label: string;
  status: "pending" | "in_progress" | "completed" | "error";
};

const INITIAL_STEPS: GenerationStep[] = [
  { label: "Fetching business data from Google...", status: "pending" },
  { label: "Generating logo...", status: "pending" },
  { label: "Analyzing customer reviews...", status: "pending" },
  { label: "Setting up Next.js project...", status: "pending" },
  { label: "Designing pages with AI...", status: "pending" },
  { label: "Preparing live preview...", status: "pending" },
];

type ViewportMode = "desktop" | "tablet" | "mobile";

type ColorPalette = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

type DesignTemplate = {
  id: string;
  name: string;
  description: string;
  image: string;
  style: string;
  category?: string;
};

const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "corporate-clean",
    name: "Corporate Clean",
    description: "Profesjonell hero med statistikk-seksjon, klient-logoer og tjenestekort",
    image: "/templates/minimalist.svg",
    style: "corporate-clean",
  },
  {
    id: "bold-dark",
    name: "Bold Dark",
    description: "Mørkt tema med neon-aksentfarger, store tall og kraftig typografi",
    image: "/templates/bold.svg",
    style: "bold-dark",
  },
  {
    id: "warm-organic",
    name: "Warm Organic",
    description: "Varme jordtoner, avrundede former og naturlig, innbydende følelse",
    image: "/templates/elegant.svg",
    style: "warm-organic",
  },
  {
    id: "glass-modern",
    name: "Glass Modern",
    description: "Glassmorphism-kort, gradient-bakgrunner og futuristisk layout",
    image: "/templates/modern.svg",
    style: "glass-modern",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magasin-inspirert med store bilder, asymmetrisk grid og serif-fonter",
    image: "/templates/minimalist.svg",
    style: "editorial",
  },
  {
    id: "startup-energy",
    name: "Startup Energy",
    description: "Grønn energi-vibe med statistikk-badges, testimonials og feature-grid",
    image: "/templates/bold.svg",
    style: "startup-energy",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Meny-fokusert med matbilder-stil, åpningstider og bestillings-CTA",
    image: "/templates/restaurant.svg",
    style: "restaurant",
    category: "restaurant",
  },
  {
    id: "salon",
    name: "Frisør & Salong",
    description: "Stilrent med booking-fokus, prisliste og galleri-seksjon",
    image: "/templates/salon.svg",
    style: "salon",
    category: "salon",
  },
  {
    id: "tradesperson",
    name: "Håndverker",
    description: "Tillitvekkende med prosjekt-galleri, sertifiseringer og kontaktskjema",
    image: "/templates/modern.svg",
    style: "tradesperson",
    category: "tradesperson",
  },
  {
    id: "clinic",
    name: "Klinikk & Helse",
    description: "Rent medisinsk design med tjenesteliste, team-seksjon og timebestilling",
    image: "/templates/elegant.svg",
    style: "clinic",
    category: "clinic",
  },
];

// ─── Builder Page ─────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  // Translated step labels (INITIAL_STEPS is module-level, so we map here)
  const STEP_LABELS: Record<string, string> = {
    "Fetching business data from Google...": t("builder.steps.fetchingData"),
    "Generating logo...": t("builder.steps.generatingLogo"),
    "Analyzing customer reviews...": t("builder.steps.analyzingReviews"),
    "Setting up Next.js project...": t("builder.steps.settingUp"),
    "Designing pages with AI...": t("builder.steps.designingPages"),
    "Preparing live preview...": t("builder.steps.preparingPreview"),
  };

  // Translated template descriptions & names (DESIGN_TEMPLATES is module-level)
  const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
    "corporate-clean": t("builder.templates.corporateClean"),
    "bold-dark": t("builder.templates.boldDark"),
    "warm-organic": t("builder.templates.warmOrganic"),
    "glass-modern": t("builder.templates.glassModern"),
    "editorial": t("builder.templates.editorial"),
    "startup-energy": t("builder.templates.startupEnergy"),
    "restaurant": t("builder.templates.restaurant"),
    "salon": t("builder.templates.salon"),
    "tradesperson": t("builder.templates.tradesperson"),
    "clinic": t("builder.templates.clinic"),
  };
  const TEMPLATE_NAMES: Record<string, string> = {
    "salon": t("builder.templates.salonName"),
    "tradesperson": t("builder.templates.tradespersonName"),
    "clinic": t("builder.templates.clinicName"),
  };

  // Query params
  const placeId = searchParams.get("placeId");
  const businessName = searchParams.get("name");
  const websiteId = searchParams.get("websiteId");

  // Generation state
  const [generatingFor, setGeneratingFor] = useState<Prospect | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generationDetails, setGenerationDetails] = useState<GenerationDetails | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>(INITIAL_STEPS);

  // Preview controls state
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [activePalette, setActivePalette] = useState<string | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [sectionEditMode, setSectionEditMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Template selection state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);

  // Generation warning state
  const [showGenerateWarning, setShowGenerateWarning] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<DesignTemplate | null>(null);

  // References state
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [referenceInput, setReferenceInput] = useState("");

  // Loading state for opening existing websites
  const [loadingWebsite, setLoadingWebsite] = useState(false);

  // Component Recommendations & Value state
  const [baseValue, setBaseValue] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<ComponentRecommendation[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  // Disabled by default (v2 feature)
  const [showValuePanel, setShowValuePanel] = useState(false);

  const totalValue = baseValue + Array.from(selectedComponents).reduce((sum, id) => {
    const comp = recommendations.find(c => c.id === id);
    return sum + (comp?.addedValue || 0);
  }, 0);

  const toggleComponent = (id: string) => {
    setSelectedComponents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const viewportWidths: Record<ViewportMode, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  // ─── Initialization ───────────────────────────────────────────────────────

  const initFromPlaceId = useCallback(() => {
    if (!placeId || !businessName) return;
    const prospect: Prospect = {
      id: "",
      placeId,
      name: decodeURIComponent(businessName),
      address: null,
      phone: null,
      website: null,
      rating: null,
      status: "LEAD",
    };
    setGeneratingFor(prospect);
    setShowTemplateModal(true);
  }, [placeId, businessName]);

  const initFromWebsiteId = useCallback(async () => {
    if (!websiteId) return;
    setLoadingWebsite(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}`);
      if (!res.ok) {
        setGenerationError("Could not load website");
        return;
      }
      const { website } = await res.json();
      if (!website.htmlContent) {
        setGenerationError("Website has no content");
        return;
      }

      setGeneratedHtml(website.htmlContent);
      setGeneratingFor({
        id: website.prospect?.id ?? website.id,
        placeId: website.prospect?.placeId ?? "",
        name: website.businessName ?? website.name,
        address: website.businessAddress,
        phone: website.businessPhone,
        website: null,
        rating: website.businessRating,
        status: "LEAD",
      });
      setGenerationDetails({
        name: website.businessName ?? website.name,
        address: website.businessAddress,
        phone: website.businessPhone,
        rating: website.businessRating,
        category: website.businessCategory,
        hours: website.businessHours,
      });
      setShowPreview(true);
    } catch {
      setGenerationError("Network error loading website");
    } finally {
      setLoadingWebsite(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (websiteId) {
      initFromWebsiteId();
    } else if (placeId && businessName) {
      initFromPlaceId();
    }
  }, [websiteId, placeId, businessName, initFromWebsiteId, initFromPlaceId]);

  // Fetch recommendations once when preview is shown for the generated prospect.
  useEffect(() => {
    if (!showPreview || !generatingFor) return;

    // Only fetch if we don't already have recommendations
    if (recommendations.length > 0) return;

    let isMounted = true;
    const fetchRecommendations = async () => {
      setIsLoadingRecommendations(true);
      try {
        const res = await fetch("/api/websites/recommend-components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: generatingFor.name,
            category: generationDetails?.category,
          }),
        });

        if (!isMounted) return;

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to fetch recommendations: non-ok response", err);
          setRecommendations([]);
          return;
        }

        const data = await res.json();
        setBaseValue(data.baseValue || 15000);
        setRecommendations(data.components || []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setRecommendations([]);
      } finally {
        if (isMounted) setIsLoadingRecommendations(false);
      }
    };
    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [showPreview, generatingFor, generationDetails?.category]);

  // ─── Step tracking ────────────────────────────────────────────────────────

  function updateStep(index: number, status: GenerationStep["status"]) {
    setGenerationSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, status } : step))
    );
  }

  // ─── Template & Reference handlers ────────────────────────────────────────

  function handleTemplateSelect(template: DesignTemplate) {
    setPendingTemplate(template);
    setShowTemplateModal(false);
    setShowGenerateWarning(true);
  }

  function confirmGenerate() {
    setShowGenerateWarning(false);
    if (pendingTemplate) {
      setSelectedTemplate(pendingTemplate);
      if (generatingFor) {
        handlePitch(generatingFor, pendingTemplate);
      }
      setPendingTemplate(null);
    }
  }

  function cancelGenerate() {
    setShowGenerateWarning(false);
    setPendingTemplate(null);
    // Navigate to pitch page to call first
    if (generatingFor) {
      const params = new URLSearchParams({ name: generatingFor.name });
      if (generatingFor.phone) params.set("phone", generatingFor.phone);
      if (generationDetails?.category) params.set("category", generationDetails.category);
      if (generatingFor.address) params.set("address", generatingFor.address);
      if (generatingFor.rating) params.set("rating", String(generatingFor.rating));
      router.push(`/builder/pitch?${params.toString()}`);
    }
  }

  function handleReferencesGenerate() {
    setShowTemplateModal(false);
    if (generatingFor) {
      handlePitch(generatingFor, undefined, referenceUrls);
    }
  }

  function addReferenceUrl() {
    const url = referenceInput.trim();
    if (!url || referenceUrls.length >= 3) return;
    try {
      new URL(url);
      setReferenceUrls((prev) => [...prev, url]);
      setReferenceInput("");
    } catch {
      // Invalid URL — ignore
    }
  }

  function removeReferenceUrl(index: number) {
    setReferenceUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Website Generation (SSE streaming) ───────────────────────────────────

  async function handlePitch(prospect: Prospect, template?: DesignTemplate, references?: string[]) {
    console.log(`[API] Starting generation for: "${prospect.name}"`, { template: template?.id, references });
    setGeneratingFor(prospect);
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedHtml(null);
    setShowPreview(false);
    setSaveSuccess(false);
    setSectionEditMode(false);
    setGenerationSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as const })));

    try {
      updateStep(0, "in_progress");

      const res = await fetch("/api/websites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: prospect.placeId,
          businessName: prospect.name,
          ...(template ? { templateStyle: template.style, templateCategory: template.category } : {}),
          ...(references && references.length > 0 ? { referenceUrls: references } : {}),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        updateStep(0, "error");
        setGenerationError(errorData.error ?? "Generation failed");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        updateStep(0, "error");
        setGenerationError("Failed to read response stream");
        return;
      }

      const decoder = new TextDecoder();
      let htmlAccumulator = "";
      let buffer = "";
      let firstChunkReceived = false;
      let iframeDocOpened = false;
      let currentAssets: { logo?: string | null; hero?: string | null } = {};

      const statusToStep: Record<string, number> = {
        "🎨 Logo generated": 1,
        "📸 Hero image created": 1,
        "📊 Reviews analyzed": 2,
        "🔍 References analyzed": 2,
        "🚀 Starting AI generation...": 3,
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          let parsed: { type: string; text?: string; details?: GenerationDetails; label?: string };
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (parsed.type === "details" && parsed.details) {
            setGenerationDetails(parsed.details);
            currentAssets = { logo: parsed.details.logo, hero: parsed.details.hero };
            updateStep(0, "completed");
            updateStep(1, "in_progress");
          }

          if (parsed.type === "status" && parsed.label) {
            const stepIndex = statusToStep[parsed.label];
            if (stepIndex !== undefined) {
              for (let i = 0; i < stepIndex; i++) {
                updateStep(i, "completed");
              }
              updateStep(stepIndex, "in_progress");
            }
            if (parsed.label === "🚀 Starting AI generation...") {
              updateStep(3, "completed");
              updateStep(4, "in_progress");
            }
          }

          if (parsed.type === "chunk" && parsed.text) {
            htmlAccumulator += parsed.text;

            if (!firstChunkReceived) {
              firstChunkReceived = true;
              updateStep(4, "completed");
              updateStep(5, "in_progress");
              setShowPreview(true);
            }

            // Write chunks directly to iframe for progressive rendering
            const iframe = iframeRef.current;
            if (iframe) {
              try {
                const doc = iframe.contentDocument;
                if (doc) {
                  if (!iframeDocOpened) {
                    doc.open();
                    iframeDocOpened = true;
                  }
                  let chunk = parsed.text;
                  if (currentAssets.logo) {
                    chunk = chunk.replace(/{{LOGO_DATA}}/g, currentAssets.logo);
                  }
                  if (currentAssets.hero) {
                    chunk = chunk.replace(/{{HERO_DATA}}/g, currentAssets.hero);
                  }
                  doc.write(chunk);
                }
              } catch {
                // Fallback: batch update via srcDoc (cross-origin or sandbox issue)
              }
            }
          }

          if (parsed.type === "done") {
            for (let i = 0; i < INITIAL_STEPS.length; i++) {
              updateStep(i, "completed");
            }
          }
        }
      }

      console.log(`[SSE Client] Stream complete. Total chars: ${htmlAccumulator.length}`);

      // Close the iframe document after streaming is done
      if (iframeDocOpened) {
        try {
          const doc = iframeRef.current?.contentDocument;
          if (doc) doc.close();
        } catch {
          // ignore
        }
      }

      let finalHtml = htmlAccumulator;
      if (currentAssets.logo) {
        finalHtml = finalHtml.replace(/{{LOGO_DATA}}/g, currentAssets.logo);
      }
      if (currentAssets.hero) {
        finalHtml = finalHtml.replace(/{{HERO_DATA}}/g, currentAssets.hero);
      }

      const startIndex = finalHtml.search(/<!DOCTYPE|<html/i);
      if (startIndex !== -1) {
        finalHtml = finalHtml.slice(startIndex);
        const endIndex = finalHtml.lastIndexOf("</html>");
        if (endIndex !== -1) {
          finalHtml = finalHtml.slice(0, endIndex + 7);
        }
      } else {
        finalHtml = finalHtml
          .replace(/^```html\n?/, "")
          .replace(/```$/, "")
          .trim();
      }

      console.log(`[SSE Client] Sanitized HTML length: ${finalHtml.length}`);
      setGeneratedHtml(finalHtml);

    } catch (err) {
      console.error("Generation error:", err);
      setGenerationSteps((prev) =>
        prev.map((step) =>
          step.status === "in_progress" ? { ...step, status: "error" } : step
        )
      );
      setGenerationError("Network error during generation");
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  }

  // ─── Regenerate / Save / Download ─────────────────────────────────────────

  async function handleRegenerate() {
    if (!generatingFor) return;
    await handlePitch(generatingFor, selectedTemplate ?? undefined);
  }

  async function handleSave() {
    if (!session?.user) {
      router.push("/register");
      return;
    }
    if (!generatedHtml || !generatingFor || !generationDetails) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/websites/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: generatingFor.name,
          htmlContent: generatedHtml,
          placeId: generatingFor.placeId,
          businessAddress: generationDetails.address,
          businessPhone: generationDetails.phone,
          businessRating: generationDetails.rating,
          businessCategory: generationDetails.category,
          businessHours: generationDetails.hours,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/register");
          return;
        }
        setGenerationError(data.error ?? "Save failed");
        return;
      }

      setSaveSuccess(true);
    } catch {
      setGenerationError("Network error while saving");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownloadZip() {
    if (!generatedHtml || !generatingFor) return;

    const safeName = generatingFor.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}-website.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Palette ──────────────────────────────────────────────────────────────

  function generatePalettes(): ColorPalette[] {
    return [
      { id: "original", name: "Original", primary: "", secondary: "", accent: "", background: "", text: "" },
      { id: "ocean", name: "Ocean", primary: "#0ea5e9", secondary: "#0284c7", accent: "#38bdf8", background: "#f0f9ff", text: "#0c4a6e" },
      { id: "forest", name: "Skog", primary: "#16a34a", secondary: "#15803d", accent: "#4ade80", background: "#f0fdf4", text: "#14532d" },
      { id: "sunset", name: "Solnedgang", primary: "#f97316", secondary: "#ea580c", accent: "#fb923c", background: "#fff7ed", text: "#7c2d12" },
    ];
  }

  function applyPalette(palette: ColorPalette) {
    setActivePalette(palette.id);
    setShowPaletteMenu(false);

    if (!iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    const root = doc.documentElement;

    if (palette.id === "original") {
      root.removeAttribute("style");
      return;
    }

    root.style.setProperty("--color-primary", palette.primary);
    root.style.setProperty("--color-secondary", palette.secondary);
    root.style.setProperty("--color-accent", palette.accent);
  }

  // ─── Section Editing ──────────────────────────────────────────────────────

  function injectSectionEditOverlays() {
    if (!iframeRef.current?.contentDocument) return;
    const doc = iframeRef.current.contentDocument;

    doc.querySelectorAll(".section-edit-overlay").forEach((el) => el.remove());

    const sections = doc.querySelectorAll("[data-section-type]");
    sections.forEach((section) => {
      const el = section as HTMLElement;
      el.style.position = "relative";

      const overlay = doc.createElement("div");
      overlay.className = "section-edit-overlay";
      overlay.style.cssText = `
        position:absolute;inset:0;z-index:9999;display:flex;align-items:flex-start;justify-content:flex-end;
        padding:12px;opacity:0;transition:opacity 0.2s;cursor:pointer;pointer-events:none;
      `;

      const btn = doc.createElement("button");
      const sectionType = el.getAttribute("data-section-type") ?? "section";
      btn.textContent = `✏️ Regenerate ${sectionType}`;
      btn.style.cssText = `
        pointer-events:auto;padding:6px 14px;background:#7c3aed;color:#fff;border:none;
        border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;
      `;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleRegenerateSection(sectionType, el.outerHTML);
      });

      overlay.appendChild(btn);
      el.appendChild(overlay);

      el.addEventListener("mouseenter", () => { overlay.style.opacity = "1"; });
      el.addEventListener("mouseleave", () => { overlay.style.opacity = "0"; });
    });
  }

  async function handleRegenerateSection(sectionType: string, sectionHtml: string) {
    if (!generatingFor || !generatedHtml) return;
    setRegeneratingSection(sectionType);

    let cssVars = "";
    if (iframeRef.current?.contentDocument) {
      const style = iframeRef.current.contentDocument.querySelector("style");
      if (style) {
        const varsMatch = style.textContent?.match(/:root\s*\{([^}]+)\}/);
        if (varsMatch) cssVars = varsMatch[1];
      }
    }

    try {
      const res = await fetch("/api/websites/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionHtml,
          sectionType,
          businessName: generatingFor.name,
          businessCategory: generationDetails?.category,
          fullPageCssVars: cssVars || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerationError(data.error ?? "Section regeneration failed");
        return;
      }

      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const target = doc.querySelector(`[data-section-type="${sectionType}"]`);
        if (target) {
          const temp = doc.createElement("div");
          temp.innerHTML = data.html;
          const newSection = temp.firstElementChild;
          if (newSection) {
            target.replaceWith(newSection);
            setGeneratedHtml(doc.documentElement.outerHTML);
            setTimeout(() => injectSectionEditOverlays(), 100);
          }
        }
      }
    } catch {
      setGenerationError("Network error during section regeneration");
    } finally {
      setRegeneratingSection(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // Loading state for existing website
  if (loadingWebsite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p className="text-sm text-zinc-400">Loading website...</p>
        </div>
      </div>
    );
  }

  // No params — redirect back
  if (!placeId && !websiteId && !generatingFor && !showTemplateModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-zinc-500">No business selected</p>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ── Template Selection & References Modal ── */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  {showReferences && generatingFor && (
                    <button
                      onClick={() => setShowReferences(false)}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                      {showReferences ? "Referanser" : "Velg design-stil"}
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {showReferences
                        ? "Lim inn opptil 3 nettside-URLer som inspirasjon"
                        : generatingFor ? <>for <span className="font-medium text-zinc-700">{generatingFor.name}</span></> : "Som inspirasjon for AI-en"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!showReferences && generatingFor && (
                    <button
                      onClick={() => setShowReferences(true)}
                      className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-500 active:scale-[0.97]"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Andre valg
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowTemplateModal(false);
                      if (!generatingFor) router.push("/");
                    }}
                    className="rounded-full bg-zinc-100 p-2 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {!showReferences ? (
                <>
                  {/* Template Grid */}
                  <div className="max-h-[60vh] overflow-y-auto p-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {DESIGN_TEMPLATES.map((template, i) => (
                        <motion.button
                          key={template.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => handleTemplateSelect(template)}
                          className="group flex flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-zinc-200/60 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:ring-violet-300"
                        >
                          <div className="aspect-[10/7] w-full overflow-hidden bg-zinc-50">
                            <img
                              src={template.image}
                              alt={template.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="flex flex-col gap-1 p-4">
                            <p className="text-sm font-semibold text-zinc-900">{TEMPLATE_NAMES[template.id] ?? template.name}</p>
                            <p className="text-xs leading-relaxed text-zinc-500">{TEMPLATE_DESCRIPTIONS[template.id] ?? template.description}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* References View */
                <div className="p-6">
                  <div className="flex gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                      <Link2 className="h-4 w-4 shrink-0 text-zinc-400" />
                      <input
                        type="url"
                        value={referenceInput}
                        onChange={(e) => setReferenceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addReferenceUrl();
                          }
                        }}
                        placeholder="https://eksempel.no"
                        disabled={referenceUrls.length >= 3}
                        className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addReferenceUrl}
                      disabled={!referenceInput.trim() || referenceUrls.length >= 3}
                      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-zinc-400">
                    {referenceUrls.length}/3 referanser lagt til
                  </p>

                  <div className="mt-4 space-y-2">
                    {referenceUrls.map((url, i) => {
                      let host = url;
                      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* */ }
                      const faviconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
                      const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
                      return (
                        <motion.div
                          key={url}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-zinc-200"
                        >
                          <div className="relative h-16 w-24 shrink-0 overflow-hidden bg-zinc-100">
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] text-zinc-400">Henter...</div>
                            <img
                              src={screenshotUrl}
                              alt={host}
                              className="relative z-10 h-full w-full object-cover object-top"
                              onError={(e) => { (e.currentTarget).style.display = "none"; }}
                            />
                            <img src={faviconUrl} alt="" className="absolute bottom-1 right-1 z-20 h-4 w-4 rounded-sm shadow-sm" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-2">
                            <span className="text-xs font-semibold text-zinc-800 truncate">{host}</span>
                            <span className="text-xs text-zinc-400 truncate">{url}</span>
                          </div>
                          <button
                            onClick={() => removeReferenceUrl(i)}
                            className="mr-3 shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}

                    {referenceUrls.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-12">
                        <Link2 className="h-6 w-6 text-zinc-300" />
                        <p className="mt-3 text-sm text-zinc-400">{t("builder.references.pasteUrl")}</p>
                        <p className="mt-1 text-xs text-zinc-400">{t("builder.references.aiAnalyze")}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleReferencesGenerate}
                      disabled={referenceUrls.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("builder.references.generateWithRefs")}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generation Warning Dialog ── */}
      <AnimatePresence>
        {showGenerateWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <span className="text-lg">&#9888;&#65039;</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">{t("builder.warning.title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {t("builder.warning.body1")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {t("builder.warning.body2")}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={cancelGenerate}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  {t("builder.warning.callFirst")}
                </button>
                <button
                  onClick={confirmGenerate}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {t("builder.warning.generateAnyway")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Unified Generation Progress Overlay ── */}
      <AnimatePresence>
        {isGenerating && generatingFor && !showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-2xl bg-zinc-950 p-6 shadow-2xl ring-1 ring-zinc-800"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Building website</p>
                  <p className="text-xs text-zinc-500">{generatingFor.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                {generationSteps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {step.status === "completed" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </motion.div>
                      )}
                      {step.status === "in_progress" && <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}
                      {step.status === "pending" && <div className="h-2 w-2 rounded-full bg-zinc-700" />}
                      {step.status === "error" && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                          <X className="h-3 w-3 text-red-400" />
                        </div>
                      )}
                    </div>
                    <span className={`text-sm ${step.status === "completed" ? "text-zinc-400" : step.status === "in_progress" ? "font-medium text-white" : step.status === "error" ? "text-red-400" : "text-zinc-600"}`}>
                      {STEP_LABELS[step.label] ?? step.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(generationSteps.filter((s) => s.status === "completed").length / generationSteps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generation Error Overlay ── */}
      <AnimatePresence>
        {!isGenerating && generationError && !showPreview && generatingFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-900/50 bg-red-950/50 p-8 text-center shadow-sm">
              <p className="font-medium text-red-400">{generationError}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/")}
                  className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Back to search
                </button>
                <button
                  onClick={handleRegenerate}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Website Preview ── */}
      <AnimatePresence>
        {showPreview && generatingFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex bg-zinc-950"
          >
            {/* Left Sidebar - Value & Components */}
            <AnimatePresence>
              {showValuePanel && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex flex-col border-r border-zinc-900 bg-zinc-950 shadow-xl overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-zinc-900 p-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{t("builder.preview.projectEstimate")}</h2>
                      <p className="text-xs text-zinc-500">{t("builder.preview.calculateValue")}</p>
                    </div>
                    <button onClick={() => setShowValuePanel(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 p-5 ring-1 ring-violet-500/20">
                      <p className="text-sm font-medium text-violet-300">{t("builder.preview.totalEstimatedValue")}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight text-white">{totalValue.toLocaleString("no-NO")}</span>
                        <span className="text-sm font-medium text-zinc-400">NOK</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {t("builder.preview.valueDescription")}
                      </p>
                    </div>

                    <h3 className="mb-4 text-sm font-medium text-zinc-400">{t("builder.preview.recommendedIntegrations")}</h3>

                    {isLoadingRecommendations ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="animate-pulse rounded-xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-lg bg-zinc-800" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 rounded bg-zinc-800" />
                                <div className="h-3 w-full rounded bg-zinc-800/50" />
                                <div className="h-3 w-4/5 rounded bg-zinc-800/50" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recommendations.map(comp => {
                          const IconMap: Record<string, any> = { Calendar, CreditCard, MessageCircle, ShoppingBag, Users, Map };
                          const Icon = IconMap[comp.iconName] || Tag;
                          const isSelected = selectedComponents.has(comp.id);

                          return (
                            <button
                              key={comp.id}
                              onClick={() => toggleComponent(comp.id)}
                              className={`w-full text-left flex flex-col gap-3 rounded-xl p-4 transition-all ${isSelected
                                ? "bg-violet-500/10 ring-1 ring-violet-500/50 relative overflow-hidden"
                                : "bg-zinc-900/30 ring-1 ring-zinc-800 hover:bg-zinc-900/80"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-400"}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-violet-500 bg-violet-500 text-white" : "border-zinc-700 bg-transparent text-transparent"}`}>
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </div>
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isSelected ? "text-violet-100" : "text-zinc-200"}`}>{comp.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{comp.description}</p>
                              </div>
                              <div className="mt-1 flex items-center justify-between border-t border-zinc-800/50 pt-3">
                                <span className={`text-xs font-semibold ${isSelected ? "text-violet-400" : "text-emerald-400"}`}>
                                  +{comp.addedValue.toLocaleString("no-NO")} NOK
                                </span>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{t("builder.preview.upsell")}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Domain Manager */}
                    {websiteId && (
                      <div className="mt-6 border-t border-zinc-800 pt-6">
                        <h3 className="mb-4 text-sm font-medium text-zinc-400">Custom Domain</h3>
                        <DomainManager
                          websiteId={websiteId}
                          vercelProjectId={null}
                          currentDomain={null}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Pane (Preview) */}
            <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
              {/* Top bar */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
                <div className="flex items-center gap-3">
                  {/* Value Estimator is a v2 feature and intentionally hidden in this build */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                    <Globe className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{generatingFor.name}</p>
                    <p className="text-xs text-zinc-500">AI-Generated Preview</p>
                  </div>
                </div>

                {/* Viewport Toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-zinc-700 p-1">
                  {([
                    { mode: "desktop" as ViewportMode, icon: Monitor, label: t("builder.preview.desktop") },
                    { mode: "tablet" as ViewportMode, icon: Tablet, label: t("builder.preview.tablet") },
                    { mode: "mobile" as ViewportMode, icon: Smartphone, label: t("builder.preview.mobile") },
                  ] as const).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewportMode(mode)}
                      title={label}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewportMode === mode ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Section Edit Toggle */}
                  <button
                    onClick={() => {
                      const next = !sectionEditMode;
                      setSectionEditMode(next);
                      if (next) {
                        setTimeout(() => injectSectionEditOverlays(), 200);
                      } else if (iframeRef.current?.contentDocument) {
                        iframeRef.current.contentDocument
                          .querySelectorAll(".section-edit-overlay")
                          .forEach((el) => el.remove());
                      }
                    }}
                    title={t("builder.preview.editSections")}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${sectionEditMode ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}
                  >
                    ✏️
                  </button>

                  {/* Color Palette Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPaletteMenu((v) => !v)}
                      title={t("builder.preview.changePalette")}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      <Palette className="h-4 w-4" />
                    </button>

                    <AnimatePresence>
                      {showPaletteMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl"
                        >
                          {generatePalettes().map((palette) => (
                            <button
                              key={palette.id}
                              onClick={() => applyPalette(palette)}
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${(activePalette ?? "original") === palette.id ? "bg-zinc-700 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}
                            >
                              {palette.id === "original" ? (
                                <div className="h-4 w-4 rounded-full border border-zinc-600 bg-gradient-to-br from-violet-500 to-indigo-500" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border border-zinc-600" style={{ background: palette.primary }} />
                              )}
                              {palette.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Download */}
                  <button
                    onClick={handleDownloadZip}
                    title={t("builder.preview.downloadHtml")}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {t("builder.preview.regenerate")}
                  </button>

                  {saveSuccess ? (
                    <span className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400">
                      {t("builder.preview.saved")}
                    </span>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {session?.user ? t("builder.preview.saveWebsite") : t("builder.preview.signUpToSave")}
                    </button>
                  )}

                  {/* Deploy button - shown after save */}
                  {(saveSuccess || websiteId) && generatingFor && (
                    <DeployButton
                      websiteId={websiteId ?? ""}
                      currentStatus="NONE"
                      currentUrl={null}
                    />
                  )}

                  {(saveSuccess || websiteId) && generatingFor && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set("name", generatingFor.name);
                        if (generatingFor.phone) params.set("phone", generatingFor.phone);
                        if (generationDetails?.category) params.set("category", generationDetails.category);
                        if (generatingFor.address) params.set("address", generatingFor.address);
                        if (generatingFor.rating) params.set("rating", String(generatingFor.rating));
                        router.push(`/builder/pitch?${params.toString()}`);
                      }}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                    >
                      {t("builder.preview.next")}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => router.push("/")}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Iframe with viewport simulation */}
              <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-950 p-4">
                <div
                  className="h-full transition-all duration-300 ease-in-out"
                  style={{ width: viewportWidths[viewportMode], maxWidth: "100%" }}
                >
                  <iframe
                    ref={iframeRef}
                    srcDoc={isGenerating ? undefined : (generatedHtml ?? "")}
                    title={`Preview: ${generatingFor.name}`}
                    className={`h-full w-full border-0 bg-white ${viewportMode !== "desktop" ? "rounded-xl shadow-2xl ring-1 ring-zinc-700" : ""}`}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>

              {/* Compact progress indicator */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-6 right-6 z-20 flex items-center gap-3 rounded-xl bg-zinc-950/90 px-4 py-2.5 shadow-2xl ring-1 ring-zinc-700 backdrop-blur-md"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                    <span className="text-xs font-medium text-white">{t("builder.preview.buildingWebsite")}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Section regeneration loading */}
              {regeneratingSection && (
                <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-zinc-800/95 px-5 py-3 text-sm text-white shadow-lg ring-1 ring-zinc-700">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  {t("builder.preview.regenerating")} {regeneratingSection}...
                </div>
              )}

              {/* Error toast */}
              {generationError && !regeneratingSection && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-red-500/90 px-5 py-3 text-sm text-white shadow-lg">
                  {generationError}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
