"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fireToast } from "@/components/ToastStack";

export default function ProfileForm({
  initialName,
  initialContactNumber,
  initialProfilePicture,
}: {
  initialName: string;
  initialContactNumber: string;
  initialProfilePicture: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [contactNumber, setContactNumber] = useState(initialContactNumber);
  const [profilePicture, setProfilePicture] = useState<string | null>(initialProfilePicture);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Photo upload failed.");
      }
      const { url } = await response.json();
      setProfilePicture(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Photo upload failed.";
      fireToast({ type: "error", message });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactNumber, profilePicture }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save your profile.");
      }

      // Force an immediate JWT/session refresh so the new name/avatar show
      // up everywhere (Nav, etc.) without logging out and back in.
      await update();
      router.refresh();
      fireToast({ type: "info", message: "Profile updated." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save your profile.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <div className="flex items-center gap-5">
        <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-center text-[10px] text-zinc-500 hover:border-violet-400/50">
          {profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
          ) : uploading ? (
            <span>Uploading…</span>
          ) : (
            <span>+ Photo</span>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-zinc-500">Upload a profile picture (PNG, JPEG, or WEBP).</p>
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 255))}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Contact Number</label>
        <input
          type="text"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value.slice(0, 40))}
          placeholder="e.g. +63 900 000 0000"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || submitting}
        className="btn-primary mt-8 w-full disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
