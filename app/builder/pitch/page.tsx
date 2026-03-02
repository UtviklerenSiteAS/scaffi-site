"use client";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  Mail,
  Phone,
  Lightbulb,
  MapPin,
  Star,
  ExternalLink,
} from "lucide-react";

type PitchData = {
  phonePitch: string;
  phoneTips: string[];
  emailSubject: string;
  emailBody: string;
};

export default function PitchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const name = searchParams.get("name") ?? t("pitch.unknownBusiness");
  const phone = searchParams.get("phone") ?? "";
  const category = searchParams.get("category") ?? "";
  const address = searchParams.get("address") ?? "";
  const rating = searchParams.get("rating")
    ? parseFloat(searchParams.get("rating")!)
    : null;

  const [showHelp, setShowHelp] = useState(false);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generatePitch = useCallback(async () => {
    if (pitchData) {
      setShowHelp(true);
      return;
    }

    setShowHelp(true);
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/pitch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || undefined,
          phone: phone || undefined,
          address: address || undefined,
          rating: rating ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("pitch.couldNotGenerate"));
      }

      const data: PitchData = await res.json();
      setPitchData(data);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : t("pitch.somethingWentWrong")
      );
    } finally {
      setIsGenerating(false);
    }
  }, [pitchData, name, category, phone, address, rating]);

  const copyToClipboard = useCallback(
    async (text: string, field: string) => {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    },
    []
  );

  const mailtoLink = pitchData
    ? `mailto:?subject=${encodeURIComponent(pitchData.emailSubject)}&body=${encodeURIComponent(pitchData.emailBody)}`
    : "";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{name}</h1>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              {category && <span>{category}</span>}
              {rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {rating}
                </span>
              )}
              {address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {address}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Phone Section */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
            {t("pitch.callBusiness")}
          </h2>

          {phone ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="mb-4 text-2xl font-semibold tracking-wide text-zinc-200">
                {phone}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                >
                  <Phone className="h-4 w-4" />
                  {t("pitch.callNow")}
                </a>
                <button
                  onClick={generatePitch}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <Lightbulb className="h-4 w-4" />
                  {t("pitch.helpAndGuidance")}
                  {showHelp ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-500">
              {t("pitch.phoneUnavailable")}
            </div>
          )}

          {/* Help Panel */}
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-950/20 p-6">
                  {isGenerating ? (
                    <div className="flex items-center gap-3 text-violet-300">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{t("pitch.generatingHelp")}</span>
                    </div>
                  ) : generateError ? (
                    <div className="text-red-400">
                      <p className="mb-2 font-medium">{t("pitch.generationError")}</p>
                      <p className="text-sm">{generateError}</p>
                      <button
                        onClick={() => {
                          setPitchData(null);
                          generatePitch();
                        }}
                        className="mt-3 text-sm text-violet-400 underline hover:text-violet-300"
                      >
                        {t("pitch.tryAgain")}
                      </button>
                    </div>
                  ) : pitchData ? (
                    <div className="space-y-6">
                      {/* Phone Pitch */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-sm font-medium text-violet-300">
                            {t("pitch.salesPitch")}
                          </h3>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                pitchData.phonePitch,
                                "pitch"
                              )
                            }
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                          >
                            {copiedField === "pitch" ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {t("pitch.copy")}
                          </button>
                        </div>
                        <p className="rounded-lg bg-zinc-900/60 p-4 text-sm leading-relaxed text-zinc-300">
                          &ldquo;{pitchData.phonePitch}&rdquo;
                        </p>
                      </div>

                      {/* Tips */}
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-violet-300">
                          {t("pitch.conversationTips")}
                        </h3>
                        <ul className="space-y-2">
                          {pitchData.phoneTips.map((tip, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-zinc-300"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Divider */}
        <div className="mb-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-sm text-zinc-600">{t("pitch.orSendEmail")}</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Email Section */}
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
            {t("pitch.sendEmail")}
          </h2>

          {pitchData ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              {/* Subject */}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  {t("pitch.subject")}
                </label>
                <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-2.5">
                  <span className="text-sm text-zinc-200">
                    {pitchData.emailSubject}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(pitchData.emailSubject, "subject")
                    }
                    className="ml-2 text-zinc-500 hover:text-zinc-300"
                  >
                    {copiedField === "subject" ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="mb-5">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  {t("pitch.content")}
                </label>
                <div className="rounded-lg bg-zinc-800/50 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                    {pitchData.emailBody}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Emne: ${pitchData.emailSubject}\n\n${pitchData.emailBody}`,
                      "email"
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  {copiedField === "email" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {t("pitch.copyAll")}
                </button>
                <a
                  href={mailtoLink}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
                >
                  <Mail className="h-4 w-4" />
                  {t("pitch.openEmailClient")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="mb-3 text-sm text-zinc-500">
                {t("pitch.emailPrompt")}
              </p>
              <button
                onClick={generatePitch}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                {t("pitch.generateSalesText")}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
