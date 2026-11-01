'use client';

import React, { useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PhotoUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  helperText?: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  images,
  onChange,
  maxImages = 4,
  label = 'Item Photographs (Optional)',
  helperText = 'Upload clear, safe images. Do not upload photos showing private government IDs, credit card numbers, or sensitive serials.',
}) => {
  const [dragOver, setDragOver] = useState(false);

  const sampleImages = [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      if (images.length < maxImages) {
        onChange([...images, url]);
      }
    }
  };

  const handleAddSample = (sampleUrl: string) => {
    if (images.length < maxImages && !images.includes(sampleUrl)) {
      onChange([...images, sampleUrl]);
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label} ({images.length}/{maxImages})
        </label>
      </div>

      {/* Grid of uploaded images */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {images.map((img, index) => (
          <div
            key={index}
            className="relative h-28 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group bg-slate-100 dark:bg-slate-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={`Upload preview ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors shadow-xs"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const url = URL.createObjectURL(e.dataTransfer.files[0]);
                onChange([...images, url]);
              }
            }}
            className={`h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 cursor-pointer transition-all ${
              dragOver
                ? 'border-brandTeal-500 bg-brandTeal-50/50 dark:bg-brandTeal-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-900/50'
            }`}
          >
            <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center">
              Upload Image
            </span>
            <span className="text-[9px] text-slate-400">PNG, JPG up to 10MB</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {/* Quick sample photo selector for testing demo without needing local files */}
      <div className="pt-1">
        <p className="text-[10px] text-slate-400 mb-1">Or click a sample campus photo for quick testing:</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleImages.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddSample(s)}
              disabled={images.includes(s) || images.length >= maxImages}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              + Photo {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
          {helperText}
        </p>
      )}
    </div>
  );
};

