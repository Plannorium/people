"use client";

import React, { useState, useRef, useId } from "react";
import { ArrowUpFromLine, FileCheck2, X } from "lucide-react";
import { Spinner } from "./Button";

interface FileUploadProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (fileKey: string) => void;
  error?: string;
  isRequired?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  hint,
  value,
  onChange,
  error,
  isRequired,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFile = async (file: File) => {
    setUploadError(null);

    // Size check: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds the 10 MB limit.");
      return;
    }

    // Type check
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only PDF, JPG and PNG files are accepted.");
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      // 1. Request signed upload parameters from the server
      const res = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to obtain upload authorization.");
      }

      const { uploadUrl, key, fields } = await res.json();

      // 2. Upload file directly to secure storage
      const formData = new FormData();
      formData.append("file", file);
      Object.entries(fields as Record<string, string | number>).forEach(([k, v]) => {
        formData.append(k, String(v));
      });
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload to secure storage failed. Please try again.");
      }

      onChange(key);
    } catch (err) {
      console.error("[Upload Error]", err);
      setUploadError((err as Error).message || "Failed to upload file.");
      setFileName(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    onChange("");
    setFileName(null);
    setUploadError(null);
  };

  const message = error || uploadError;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline gap-1 text-footnote font-medium text-label">
        <span>{label}</span>
        {isRequired && (
          <span aria-hidden="true" className="text-tint">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        disabled={isUploading}
      />

      {value ? (
        <div className="flex min-h-36 items-center gap-3 rounded-[18px] border border-tint/25 bg-tint/8 px-5 py-5">
          <FileCheck2 aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-subhead font-medium text-label">{fileName || "Document on file"}</p>
            <p className="text-footnote text-label-2">Stored privately</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="pressable flex h-11 w-11 items-center justify-center rounded-full text-label-2 hover:bg-fill-strong hover:text-label"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-disabled={isUploading}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isUploading) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`pressable flex min-h-36 flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors ${
            isDragging
              ? "border-tint bg-tint/5"
              : message
                ? "border-danger/50 bg-danger/5"
                : "border-white/15 bg-canvas hover:border-tint/40 hover:bg-tint/5"
          }`}
        >
          {isUploading ? (
            <>
              <Spinner className="h-5 w-5 text-label-2" />
              <p className="text-footnote text-label-2">Uploading {fileName}…</p>
            </>
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint/10 text-tint">
                <ArrowUpFromLine aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="text-subhead text-label">
                <span className="font-semibold text-tint">Choose a file</span> or drag it here
              </p>
              <p className="text-footnote text-label-2">{hint || "PDF, JPG or PNG, up to 10 MB"}</p>
            </>
          )}
        </div>
      )}

      {message && (
        <p role="alert" className="mt-1.5 text-footnote text-danger">
          {message}
        </p>
      )}
    </div>
  );
};
