"use client";

import { useRef, useState } from "react";
import { UploadCloud, Link, Loader2, X, Image as ImageIcon } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PhotoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
}

export default function PhotoUploader({
  value,
  onChange,
  label = "Photo",
  required = false,
}: PhotoUploaderProps) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imgBroken, setImgBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError("");
    setUploading(true);
    setImgBroken(false);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`${API_URL}/api/upload/photo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.message || "Upload failed");
        return;
      }

      onChange(data.url);
    } catch {
      setUploadError("Network error. Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const hasPreview =
    value &&
    !imgBroken &&
    (() => {
      try {
        const p = new URL(value);
        return p.protocol === "http:" || p.protocol === "https:";
      } catch {
        return false;
      }
    })();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Tab switcher */}
      <div className="flex border rounded-lg overflow-hidden mb-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-1.5 transition ${
            tab === "upload"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`cursor-pointer flex-1 flex items-center justify-center gap-1.5 py-1.5 border-l transition ${
            tab === "url"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          Paste URL
        </button>
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer ${
              uploading
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1 text-blue-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Uploading…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <UploadCloud className="w-6 h-6" />
                <span className="text-xs">
                  Click or drag &amp; drop an image
                </span>
                <span className="text-[10px] text-gray-300">
                  Max 5 MB · JPG, PNG, WEBP
                </span>
              </div>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-red-500 mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {/* URL tab */}
      {tab === "url" && (
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setImgBroken(false);
            onChange(e.target.value);
          }}
          placeholder="https://example.com/photo.jpg"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      )}

      {/* Preview */}
      {hasPreview ? (
        <div className="relative mt-2 inline-block">
          <img
            src={value}
            alt="Photo preview"
            onError={() => setImgBroken(true)}
            className="h-20 w-20 rounded-lg object-cover border"
          />
          <button
            type="button"
            onClick={() => { onChange(""); setImgBroken(false); }}
            className="cursor-pointer absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-600 transition"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : value && !imgBroken ? null : value ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>No valid preview</span>
        </div>
      ) : null}
    </div>
  );
}
