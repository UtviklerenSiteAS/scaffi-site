"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  Shield,
  Trash2,
  User,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // ─── Profil ───────────────────────────────────────────────────────────────
  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  // ─── Passord ──────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── Slett konto ──────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ─── Eksport ──────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  const user = session.user;
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";
  const isGoogleUser = !!(user.image && !user.email?.includes("@") === false && !session);
  const tier = user.subscriptionTier ?? "FREE";

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveName(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    setNameError("");
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "name", name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error ?? "Noe gikk galt");
      } else {
        await updateSession();
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2500);
      }
    } catch {
      setNameError("Nettverksfeil, prøv igjen");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: { preventDefault(): void }) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Passordene stemmer ikke overens" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ ok: false, text: data.error ?? "Noe gikk galt" });
      } else {
        setPasswordMsg({ ok: true, text: "Passord oppdatert" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMsg({ ok: false, text: "Nettverksfeil, prøv igjen" });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scaffi-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "SLETT") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Noe gikk galt");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Nettverksfeil, prøv igjen");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        {/* ── Profilkort ── */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-100">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? "Profil"}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-xl font-semibold text-white">
                {initials}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-zinc-900">{user.name ?? "Ukjent"}</p>
              <p className="text-sm text-zinc-500">{user.email}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tier === "PRO" ? "bg-violet-100 text-violet-700"
                : tier === "STARTER" ? "bg-blue-100 text-blue-700"
                : "bg-zinc-100 text-zinc-500"
              }`}>
                {tier === "PRO" ? "Pro" : tier === "STARTER" ? "Starter" : "Gratis"}
              </span>
            </div>
          </div>

          {/* Rediger navn */}
          <form onSubmit={handleSaveName} className="pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Rediger profil</h2>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Navn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border-0 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">E-post</label>
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className="mt-1 w-full rounded-xl border-0 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-400 outline-none ring-1 ring-zinc-200 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-400">E-post kan ikke endres her</p>
            </div>
            {nameError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{nameError}</p>
            )}
            <button
              type="submit"
              disabled={savingName || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
            >
              {savingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : nameSaved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {nameSaved ? "Lagret!" : "Lagre navn"}
            </button>
          </form>
        </div>

        {/* ── Passord (kun for ikke-Google-brukere) ── */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Endre passord</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Nåværende passord</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border-0 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Nytt passord</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minst 8 tegn"
                className="mt-1 w-full rounded-xl border-0 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Bekreft nytt passord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border-0 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            {passwordMsg && (
              <p className={`rounded-lg px-3 py-2 text-xs ${
                passwordMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}>
                {passwordMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
            >
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Endre passord
            </button>
          </form>
        </div>

        {/* ── Abonnement ── */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-700">Abonnement</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Du er på <span className="font-semibold text-zinc-900">{
                  tier === "PRO" ? "Pro ($199/mnd)"
                  : tier === "STARTER" ? "Starter ($49/mnd)"
                  : "Gratis-planen"
                }</span>
              </p>
            </div>
            <button
              onClick={() => router.push("/pricing")}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {tier === "FREE" ? "Oppgrader" : "Administrer"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── GDPR / Personvern ── */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-700">Personvern og dine data</h2>
            <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
              Scaffi behandler personopplysninger på grunnlag av kontrakt (GDPR art. 6 nr. 1 b).
              Vi lagrer navn, e-post, og data du oppretter i tjenesten (søk, nettsider, domener).
              Data lagres i EU/EØS via Neon (PostgreSQL). Du har rett til innsyn, retting, sletting
              og dataportabilitet i henhold til personopplysningsloven og GDPR.
            </p>
          </div>

          {/* Last ned data */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-800">Last ned dine data</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Eksporter alle personopplysninger vi har lagret om deg (JSON-format)
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Last ned
            </button>
          </div>

          {/* Datatilsynet */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-800">Klage til Datatilsynet</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Dersom du mener vi behandler personopplysningene dine i strid med GDPR, kan du klage til Datatilsynet
              </p>
            </div>
            <a
              href="https://www.datatilsynet.no/om-datatilsynet/kontakt-oss/klage-til-datatilsynet/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Datatilsynet
            </a>
          </div>

          {/* Slett konto */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50/50 p-4">
            <div>
              <p className="text-sm font-medium text-red-800">Slett konto</p>
              <p className="mt-0.5 text-xs text-red-500">
                Sletter kontoen din og alle tilknyttede data permanent. Kan ikke angres.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Slett
            </button>
          </div>
        </div>

        {/* ── Logg ut ── */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <LogOut className="h-4 w-4" />
          Logg ut
        </button>
      </div>

      {/* ── Slett konto-modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-900">Slett konto</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Dette vil permanent slette kontoen din, alle nettsider, søk og data.
              Denne handlingen kan <strong>ikke angres</strong>.
            </p>
            <p className="mt-4 text-sm text-zinc-700">
              Skriv <span className="font-mono font-bold">SLETT</span> for å bekrefte:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="SLETT"
              className="mt-2 w-full rounded-xl border-0 bg-zinc-50 px-4 py-2.5 text-sm font-mono outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-red-400"
            />
            {deleteError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{deleteError}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeleteError(""); }}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "SLETT" || deleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Slett permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
