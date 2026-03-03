"use client"
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

import { motion, AnimatePresence } from "motion/react";
import {
  Archive,
  ArrowRight,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { LineShadowText } from "@/components/ui/line-shadow-text";

// ─── Types ──────────────────────────────────────────────────────────────────

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

type SavedWebsite = {
  id: string;
  name: string;
  htmlContent: string | null;
  status: string;
  createdAt: string;
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessRating: number | null;
  businessCategory: string | null;
  businessHours: string | null;
  prospect: { id: string; placeId: string | null; name: string } | null;
};

type SavedProspect = {
  id: string;
  placeId: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  status: string;
  createdAt: string;
  websites: { id: string }[];
};

type DashboardTab = "calls" | "websites" | "archived";

// ─── Sidebar tabs config ────────────────────────────────────────────────────

const SIDEBAR_TABS: { id: DashboardTab; icon: typeof Globe; label: string }[] = [
  { id: "calls", icon: Phone, label: "Samtaler" },
  { id: "websites", icon: Globe, label: "Nettsider" },
  { id: "archived", icon: Archive, label: "Arkiv" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const confettiRef = useRef<ConfettiRef>(null);

  const [savingProspect, setSavingProspect] = useState<string | null>(null);
  const [savedProspectIds, setSavedProspectIds] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<DashboardTab>("calls");

  const [savedWebsites, setSavedWebsites] = useState<SavedWebsite[]>([]);
  const [archivedWebsites, setArchivedWebsites] = useState<SavedWebsite[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [allProspects, setAllProspects] = useState<SavedProspect[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchSavedWebsites = useCallback(async () => {
    if (!session?.user) return;
    setLoadingSaved(true);
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/websites"),
        fetch("/api/websites?status=ARCHIVED"),
      ]);
      if (activeRes.ok) setSavedWebsites((await activeRes.json()).websites);
      if (archivedRes.ok) setArchivedWebsites((await archivedRes.json()).websites);
    } catch {
      console.error("Failed to fetch saved websites");
    } finally {
      setLoadingSaved(false);
    }
  }, [session?.user]);

  const fetchProspects = useCallback(async () => {
    if (!session?.user) return;
    setLoadingProspects(true);
    try {
      const [leadRes, qualifiedRes] = await Promise.all([
        fetch("/api/prospects?status=LEAD"),
        fetch("/api/prospects?status=QUALIFIED"),
      ]);
      const leads: SavedProspect[] = leadRes.ok ? (await leadRes.json()).prospects : [];
      const qualified: SavedProspect[] = qualifiedRes.ok ? (await qualifiedRes.json()).prospects : [];
      setAllProspects([...leads, ...qualified]);
    } catch {
      console.error("Failed to fetch prospects");
    } finally {
      setLoadingProspects(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchSavedWebsites();
    fetchProspects();
  }, [fetchSavedWebsites, fetchProspects]);

  useEffect(() => {
    const ids = new Set<string>();
    for (const p of allProspects) {
      if (p.placeId) ids.add(p.placeId);
    }
    setSavedProspectIds(ids);
  }, [allProspects]);

  const hasNoWebsiteProspects = !loading && !error && prospects.length > 0;

  useEffect(() => {
    if (hasNoWebsiteProspects) {
      confettiRef.current?.fire({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.4 },
      });
    }
  }, [hasNoWebsiteProspects]);

  const tabCounts: Record<DashboardTab, number> = {
    calls: allProspects.length,
    websites: savedWebsites.length,
    archived: archivedWebsites.length,
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleSearch(e?: { preventDefault(): void }, isLoadMore = false) {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    if (!isLoadMore) {
      setIsModalOpen(true);
      setLoading(true);
      setError(null);
      setProspects([]);
      setNextPageToken(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch("/api/prospects/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, pageToken: isLoadMore ? nextPageToken : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        if (isLoadMore) {
          setProspects((prev) => [...prev, ...(data.prospects ?? [])]);
        } else {
          setProspects(data.prospects ?? []);
        }
        setNextPageToken(data.nextPageToken ?? null);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  }

  async function saveProspect(prospect: Prospect) {
    if (!session?.user || savedProspectIds.has(prospect.placeId)) return;
    setSavingProspect(prospect.placeId);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: prospect.placeId,
          name: prospect.name,
          phone: prospect.phone,
          website: prospect.website,
          address: prospect.address,
          rating: prospect.rating,
        }),
      });
      if (res.ok) {
        setSavedProspectIds((prev) => new Set(prev).add(prospect.placeId));
        await fetchProspects();
      }
    } catch {
      console.error("Failed to save prospect");
    } finally {
      setSavingProspect(null);
    }
  }

  // Ring-knapp: lagrer prospektet automatisk og åpner telefonen
  async function handleRing(prospect: Prospect) {
    if (!session?.user) { router.push("/login"); return; }
    if (session.user.subscriptionTier === "FREE") { router.push("/pricing"); return; }
    await saveProspect(prospect);
    if (prospect.phone) {
      window.location.href = `tel:${prospect.phone.replace(/\s/g, "")}`;
    }
  }

  function handlePitch(prospect: Prospect) {
    if (session?.user?.subscriptionTier === "FREE") { router.push("/pricing"); return; }
    setIsRedirecting(true);
    const params = new URLSearchParams({ placeId: prospect.placeId, name: prospect.name });
    if (prospect.phone) params.set("phone", prospect.phone);
    if (prospect.address) params.set("address", prospect.address);
    if (prospect.rating) params.set("rating", prospect.rating.toString());
    setTimeout(() => router.push(`/builder?${params.toString()}`), 1000);
  }

  function handleOpenSavedWebsite(website: SavedWebsite) {
    setIsRedirecting(true);
    const params = new URLSearchParams({ websiteId: website.id });
    if (website.businessName) params.set("name", website.businessName);
    if (website.businessPhone) params.set("phone", website.businessPhone);
    if (website.businessAddress) params.set("address", website.businessAddress);
    if (website.businessRating) params.set("rating", website.businessRating.toString());
    if (website.businessCategory) params.set("category", website.businessCategory);
    setTimeout(() => router.push(`/builder?${params.toString()}`), 800);
  }

  function handleOpenProspectWebsite(prospect: SavedProspect) {
    setIsRedirecting(true);
    const params = new URLSearchParams({ name: prospect.name });
    if (prospect.placeId) params.set("placeId", prospect.placeId);
    if (prospect.phone) params.set("phone", prospect.phone);
    if (prospect.address) params.set("address", prospect.address);
    if (prospect.rating) params.set("rating", prospect.rating.toString());
    setTimeout(() => router.push(`/builder?${params.toString()}`), 800);
  }

  async function updateProspectStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await fetchProspects();
    } catch {
      console.error("Failed to update prospect status");
    }
  }

  async function updateWebsiteStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/websites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await fetchSavedWebsites();
    } catch {
      console.error("Failed to update website status");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 selection:bg-violet-200">
      {/* ── Top-right nav ── */}
      <div className="fixed right-6 top-6 z-40 flex items-center gap-3">
        <Link
          href="/pricing"
          className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50 active:scale-[0.97]"
        >
          Priser
        </Link>
        <LanguageSwitcher />
        {session?.user ? (
          <img
            src={session.user.image ?? undefined}
            alt={session.user.name ?? "Profile"}
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-cover ring-2 ring-zinc-200 transition-all hover:ring-violet-400 cursor-pointer"
          />
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.97]"
          >
            {t("common.signIn")}
          </Link>
        )}
      </div>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-200/25 blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-3xl text-center text-4xl font-semibold leading-[1.15] tracking-tighter text-balance sm:text-6xl md:text-7xl lg:text-8xl"
          >
            {t("home.heroTitle")}{" "}
            <LineShadowText className="italic" shadowColor="black">
              {t("home.heroHighlight")}
            </LineShadowText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-lg text-center text-base leading-relaxed text-zinc-500 sm:text-lg"
          >
            {t("home.heroSubtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 w-full max-w-xl"
          >
            <form onSubmit={(e) => handleSearch(e)} className="group relative">
              <div className="relative flex items-center rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/80 transition-all focus-within:shadow-[0_4px_30px_rgba(124,58,237,0.1)] focus-within:ring-violet-300/50">
                <BorderBeam size={140} duration={8} className="opacity-0 transition-opacity group-focus-within:opacity-100" />
                <div className="pl-5">
                  <Search className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent px-4 py-5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-base"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="mr-2 flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t("common.search")} <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {(["restaurant", "hairdresser", "dentist", "plumber", "electrician", "gym", "cafe"] as const).map((key) => {
                  const filter = t(`home.filters.${key}`);
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setQuery(filter)}
                      className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ── Dashboard ── */}
      {session?.user && (
        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="flex gap-8">
            {/* Sidebar */}
            <nav className="w-52 shrink-0">
              <div className="sticky top-24 space-y-1">
                {SIDEBAR_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const count = tabCounts[tab.id];
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-sm"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{tab.label}</span>
                      {count > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* ── Samtaler-tab ── */}
              {activeTab === "calls" && (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Samtaler</h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                        {allProspects.length}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">Ring, generer nettside og lukk salget</p>
                  </div>

                  {loadingProspects ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  ) : allProspects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-200">
                        <Phone className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                      </div>
                      <p className="mt-4 text-sm font-medium text-zinc-600">Ingen kontakter ennå</p>
                      <p className="mt-1 text-xs text-zinc-400">Søk etter bedrifter og trykk "Ring" for å legge dem til</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Not called first */}
                      {[...allProspects]
                        .sort((a, b) => (a.status === "LEAD" ? -1 : 1) || a.name.localeCompare(b.name))
                        .map((prospect) => (
                          <CallCard
                            key={prospect.id}
                            prospect={prospect}
                            onPitch={() => handleOpenProspectWebsite(prospect)}
                            onMarkContacted={() => updateProspectStatus(prospect.id, "QUALIFIED")}
                            onMarkLead={() => updateProspectStatus(prospect.id, "LEAD")}
                          />
                        ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Nettsider-tab ── */}
              {activeTab === "websites" && (
                <>
                  <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Nettsider</h2>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {savedWebsites.length}
                    </span>
                  </div>

                  {loadingSaved ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  ) : savedWebsites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-200">
                        <Globe className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                      </div>
                      <p className="mt-4 text-sm font-medium text-zinc-600">{t("home.emptyStates.noWebsites")}</p>
                      <p className="mt-1 text-xs text-zinc-400">{t("home.emptyStates.noWebsitesSub")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {savedWebsites.map((website) => (
                        <WebsiteCard
                          key={website.id}
                          website={website}
                          onOpen={() => handleOpenSavedWebsite(website)}
                          onArchive={() => updateWebsiteStatus(website.id, "ARCHIVED")}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Arkiv-tab ── */}
              {activeTab === "archived" && (
                <>
                  <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Arkiv</h2>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {archivedWebsites.length}
                    </span>
                  </div>

                  {loadingSaved ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  ) : archivedWebsites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-200">
                        <Archive className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                      </div>
                      <p className="mt-4 text-sm font-medium text-zinc-600">{t("home.emptyStates.noArchived")}</p>
                      <p className="mt-1 text-xs text-zinc-400">{t("home.emptyStates.noArchivedSub")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {archivedWebsites.map((website) => (
                        <WebsiteCard
                          key={website.id}
                          website={website}
                          onOpen={() => handleOpenSavedWebsite(website)}
                          isArchived
                          onRestore={() => updateWebsiteStatus(website.id, "PLANNING")}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Søkeresultater-modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200/50"
            >
              <Confetti
                ref={confettiRef}
                className="absolute inset-0 z-10 size-full pointer-events-none"
                manualstart
              />

              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-zinc-100 p-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{t("home.modal.title")}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                    {t("home.modal.showingResults")} <span className="font-medium text-zinc-900">&quot;{query}&quot;</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-zinc-100 p-2 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
                {loading && (
                  <div className="flex h-full flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-sm text-zinc-500 animate-pulse">{t("home.modal.searching")}</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="flex h-full flex-col items-center justify-center">
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center shadow-sm">
                      <p className="font-medium text-red-600">{error}</p>
                      <p className="mt-1 text-sm text-red-500">{t("home.modal.errorTryAgain")}</p>
                    </div>
                  </div>
                )}

                {!loading && !error && prospects.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-200">
                      <Search className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                    </div>
                    <p className="mt-4 text-sm font-medium text-zinc-600">{t("home.modal.noResults")}</p>
                    <p className="mt-1 text-xs text-zinc-400">{t("home.modal.adjustSearch")}</p>
                  </div>
                )}

                {!loading && !error && prospects.length > 0 && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {prospects.map((p, index) => {
                        const isRinging = savingProspect === p.placeId;
                        const isSaved = savedProspectIds.has(p.placeId);

                        return (
                          <motion.div
                            key={`${p.id}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="flex flex-col gap-0 rounded-2xl bg-white ring-1 ring-zinc-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                          >
                            {/* Card body */}
                            <div className="flex flex-col gap-3 p-5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                                    <Building2 className="h-4 w-4 text-violet-500" strokeWidth={1.5} />
                                  </div>
                                  <p className="font-semibold text-zinc-900 leading-tight line-clamp-2">{p.name}</p>
                                </div>
                                {p.rating != null && (
                                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    {p.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                {p.address && (
                                  <p className="flex items-start gap-2 text-xs text-zinc-500">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                    <span className="line-clamp-2">{p.address}</span>
                                  </p>
                                )}
                                {p.phone && (
                                  <p className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                                    <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                    {p.phone}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/50">
                                  Ingen nettside
                                </span>
                                {isSaved && (
                                  <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                                    <Check className="h-3 w-3" /> Lagret
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action strip */}
                            <div className="flex border-t border-zinc-100">
                              <button
                                onClick={() => handlePitch(p)}
                                className="flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                              >
                                Lag nettside <ArrowRight className="h-3 w-3" />
                              </button>
                              <div className="w-px bg-zinc-100" />
                              {p.phone ? (
                                <button
                                  onClick={() => handleRing(p)}
                                  disabled={isRinging}
                                  className="flex flex-1 items-center justify-center gap-1.5 bg-emerald-500 px-3 py-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                                >
                                  {isRinging ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Phone className="h-3.5 w-3.5" />
                                  )}
                                  Ring
                                </button>
                              ) : (
                                <span className="flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs text-zinc-300">
                                  Intet nr.
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {nextPageToken && (
                      <div className="flex justify-center pb-6">
                        <button
                          onClick={() => handleSearch(undefined, true)}
                          disabled={loadingMore}
                          className="flex items-center gap-2 rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 active:scale-[0.97] disabled:opacity-50"
                        >
                          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                          {loadingMore ? t("common.loadingMore") : t("common.loadMore")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Redirect overlay ── */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-violet-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-violet-500/20" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold tracking-tight text-zinc-900">
                  {t("home.redirecting.title")}
                </h3>
                <p className="text-sm text-zinc-500">
                  {t("home.redirecting.subtitle")}
                </p>
              </div>
            </div>
            <BorderBeam duration={3} size={600} className="from-transparent via-violet-500/40 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CallCard({
  prospect,
  onPitch,
  onMarkContacted,
  onMarkLead,
}: {
  prospect: SavedProspect;
  onPitch: () => void;
  onMarkContacted: () => void;
  onMarkLead: () => void;
}) {
  const isCalled = prospect.status === "QUALIFIED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
    >
      {/* Status bar */}
      <div className={`h-1 w-full ${isCalled ? "bg-emerald-400" : "bg-amber-400"}`} />

      <div className="flex flex-col gap-3 p-4">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-zinc-900 leading-tight line-clamp-2 text-sm">{prospect.name}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isCalled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            {isCalled ? "Kontaktet" : "Ikke ringt"}
          </span>
        </div>

        {/* Phone — most important */}
        {prospect.phone ? (
          <a
            href={`tel:${prospect.phone.replace(/\s/g, "")}`}
            onClick={!isCalled ? onMarkContacted : undefined}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-600 active:scale-[0.98]"
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span className="text-sm truncate">{prospect.phone}</span>
          </a>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3.5 py-2.5 text-xs text-zinc-400">
            <Phone className="h-4 w-4" />
            Intet telefonnummer
          </div>
        )}

        {/* Address */}
        {prospect.address && (
          <p className="flex items-start gap-1.5 text-xs text-zinc-400 leading-snug">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{prospect.address}</span>
          </p>
        )}
      </div>

      {/* Action strip */}
      <div className="flex border-t border-zinc-100">
        <button
          onClick={onPitch}
          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          Lag nettside <ArrowRight className="h-3 w-3" />
        </button>
        <div className="w-px bg-zinc-100" />
        {isCalled ? (
          <button
            onClick={onMarkLead}
            className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
          >
            <RotateCcw className="h-3 w-3" /> Tilbakestill
          </button>
        ) : (
          <button
            onClick={onMarkContacted}
            className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            <Check className="h-3.5 w-3.5" /> Kontaktet
          </button>
        )}
      </div>
    </motion.div>
  );
}

function WebsiteCard({
  website,
  onOpen,
  onArchive,
  isArchived,
  onRestore,
}: {
  website: SavedWebsite;
  onOpen: () => void;
  onArchive?: () => void;
  isArchived?: boolean;
  onRestore?: () => void;
}) {
  const t = useTranslations();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <button onClick={onOpen} className="text-left">
        <div className="relative h-44 w-full overflow-hidden bg-zinc-50">
          <iframe
            srcDoc={website.htmlContent ?? ""}
            title={website.businessName ?? website.name}
            className="pointer-events-none h-[880px] w-[1440px] origin-top-left border-0"
            style={{ transform: "scale(0.22)", transformOrigin: "top left" }}
            sandbox=""
            tabIndex={-1}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-zinc-600 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ExternalLink className="h-3 w-3" />
            {t("common.open")}
          </div>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between">
          <h3 className="truncate text-sm font-semibold text-zinc-900">
            {website.businessName ?? website.name}
          </h3>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { onOpen(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {t("common.open")}
                  </button>
                  {isArchived && onRestore ? (
                    <button
                      onClick={() => { onRestore(); setShowMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> {t("home.actions.restore")}
                    </button>
                  ) : onArchive ? (
                    <button
                      onClick={() => { onArchive(); setShowMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Archive className="h-3.5 w-3.5" /> {t("home.actions.archive")}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {website.businessCategory && <span className="truncate">{website.businessCategory}</span>}
          {website.businessRating && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {website.businessRating}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="h-3 w-3" />
            {new Date(website.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            website.status === "LIVE" ? "bg-emerald-50 text-emerald-600"
              : website.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-600"
                : website.status === "ARCHIVED" ? "bg-zinc-100 text-zinc-400"
                  : "bg-zinc-100 text-zinc-500"
          }`}>
            {website.status === "LIVE" ? t("home.status.live")
              : website.status === "IN_PROGRESS" ? t("home.status.inProgress")
                : website.status === "ARCHIVED" ? t("home.status.archived")
                  : t("home.status.draft")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
