"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type ProfileSettingsCardProps = {
  name: string;
  email: string;
  image?: string | null;
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

export function ProfileSettingsCard({ name, email, image }: ProfileSettingsCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(name);
  const [previewImage, setPreviewImage] = useState<string | null>(image ?? null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSelectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be 2MB or smaller.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewImage(dataUrl);
      setPendingImage(dataUrl);
    } catch {
      setError("Unable to process selected image.");
    }
  };

  const saveProfile = async () => {
    if (loading) return;

    const nextName = displayName.trim();
    if (nextName.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await authClient.updateUser({
        name: nextName,
        image: pendingImage ?? undefined,
      });

      if (result?.error) {
        setError(result.error.message || "Failed to update profile.");
        return;
      }

      setPendingImage(null);
      setSuccess("Profile updated.");
      router.refresh();
    } catch {
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 rounded-full border sm:h-20 sm:w-20">
              <AvatarImage src={previewImage ?? undefined} alt={displayName} />
              <AvatarFallback className="rounded-full text-base font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Change profile image"
              title="Change profile image"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onSelectImage}
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-medium">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <label className="w-full max-w-xs space-y-1 text-sm">
          <span className="text-muted-foreground">Name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            maxLength={80}
            placeholder="Enter your name"
          />
        </label>
        <Button type="button" onClick={saveProfile} disabled={loading} className="ml-auto">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-green-600">{success}</p> : null}
    </section>
  );
}
