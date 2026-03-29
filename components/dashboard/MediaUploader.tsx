'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { isAllowedContentType, getMediaType, validateFileSize } from '@/lib/media/validation';
import { ALLOWED_CONTENT_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '@/types/media';
import { requestUploadUrl, uploadFileToS3, MediaAPIError } from '@/lib/api/mediaClient';

interface MediaUploaderProps {
  onMediaAttached: (mediaId: string, mediaType: 'image' | 'video') => void;
  onMediaRemoved: () => void;
  initialMediaId?: string;
  initialMediaType?: 'image' | 'video';
  initialMediaUrl?: string;
  disabled?: boolean;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'done' | 'error';

const ACCEPT = ALLOWED_CONTENT_TYPES.join(',');

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  onMediaAttached,
  onMediaRemoved,
  initialMediaId,
  initialMediaType,
  initialMediaUrl,
  disabled = false,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>(initialMediaId ? 'done' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialMediaUrl ?? null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(initialMediaType ?? null);
  const [mediaId, setMediaId] = useState<string | null>(initialMediaId ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && !initialMediaUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, initialMediaUrl]);

  const resetState = useCallback(() => {
    if (previewUrl && previewUrl !== initialMediaUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadState('idle');
    setError(null);
    setPreviewUrl(null);
    setMediaType(null);
    setMediaId(null);
    setFileName(null);
    lastFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl, initialMediaUrl]);

  const handleRemove = useCallback(() => {
    resetState();
    onMediaRemoved();
  }, [resetState, onMediaRemoved]);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    lastFileRef.current = file;

    // Client-side type validation
    if (!isAllowedContentType(file.type)) {
      setError(`File type "${file.type}" is not supported. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, WebM.`);
      setUploadState('error');
      return;
    }

    const type = getMediaType(file.type);
    const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    // Client-side size validation
    if (!validateFileSize(file.size, type)) {
      setError(`File is too large (${formatSize(file.size)}). Maximum for ${type}s is ${formatSize(maxSize)}.`);
      setUploadState('error');
      return;
    }

    setMediaType(type);
    setFileName(file.name);

    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setUploadState('uploading');

      // Request presigned URL from our API
      const { uploadUrl, mediaId: newMediaId } = await requestUploadUrl(
        file.type,
        file.name,
        file.size
      );

      // Upload directly to S3
      await uploadFileToS3(uploadUrl, file);

      setMediaId(newMediaId);
      setUploadState('done');
      onMediaAttached(newMediaId, type);
    } catch (err) {
      const message = err instanceof MediaAPIError
        ? err.message
        : 'Upload failed. Please try again.';
      setError(message);
      setUploadState('error');
    }
  }, [onMediaAttached]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  }, [uploadFile]);

  const handleRetry = useCallback(() => {
    if (lastFileRef.current) {
      uploadFile(lastFileRef.current);
    }
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploadState === 'uploading') return;
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [disabled, uploadState, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="w-full">
      {/* File picker / drop zone — shown when idle or error with no preview */}
      {(uploadState === 'idle' || (uploadState === 'error' && !previewUrl)) && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !disabled && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          aria-label="Upload media file"
          className={`
            flex flex-col items-center justify-center gap-2 p-6 rounded-xl
            ghost-border cursor-pointer transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--surface-container-low)]'}
          `}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--outline)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm" style={{ color: 'var(--outline)' }}>
            Drop an image or video here, or click to browse
          </span>
          <span className="text-xs" style={{ color: 'var(--outline-variant)' }}>
            Images up to 10 MB · Videos up to 100 MB
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Upload progress */}
      {uploadState === 'uploading' && (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl ghost-border">
          {previewUrl && mediaType === 'image' && (
            <img src={previewUrl} alt="Uploading preview" className="max-h-32 rounded-lg object-contain" />
          )}
          {previewUrl && mediaType === 'video' && (
            <video src={previewUrl} className="max-h-32 rounded-lg" muted />
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--outline-variant)', borderTopColor: 'var(--primary)' }} />
            <span className="text-sm" style={{ color: 'var(--outline)' }}>
              Uploading {fileName ?? 'file'}…
            </span>
          </div>
        </div>
      )}

      {/* Preview — shown when upload is done or error with existing preview */}
      {(uploadState === 'done' || (uploadState === 'error' && previewUrl)) && (
        <div className="relative rounded-xl ghost-border overflow-hidden">
          {mediaType === 'image' && previewUrl && (
            <img src={previewUrl} alt="Attached media" className="w-full max-h-48 object-contain bg-black/5" />
          )}
          {mediaType === 'video' && previewUrl && (
            <video src={previewUrl} controls className="w-full max-h-48" />
          )}
          {!disabled && (
            <button
              onClick={handleRemove}
              aria-label="Remove media"
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-white text-sm"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              ✕
            </button>
          )}
          {fileName && (
            <div className="px-3 py-1.5 text-xs truncate" style={{ color: 'var(--outline)' }}>
              {fileName}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-start gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--on-error)', color: 'var(--error)' }}>
          <span className="flex-1">{error}</span>
          {uploadState === 'error' && lastFileRef.current && (
            <button
              onClick={handleRetry}
              className="shrink-0 underline font-medium"
              style={{ color: 'var(--primary)' }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
