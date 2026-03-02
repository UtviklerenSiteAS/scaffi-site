"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { setLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "no", label: "Norsk" },
  { code: "en", label: "English" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleChange(code: Locale) {
    setOpen(false);
    await setLocale(code);
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 backdrop-blur-sm transition-all hover:bg-white hover:ring-zinc-300"
      >
        <Globe className="h-3.5 w-3.5" />
        {locale === "no" ? "NO" : "EN"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-32 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
                locale === lang.code
                  ? "bg-zinc-100 font-semibold text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
