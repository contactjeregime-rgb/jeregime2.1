"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";

type Props = {
  beforeSrc: string; // gauche
  afterSrc: string;  // droite
  alt?: string;
  className?: string;
  initial?: number; // 0..100
};

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt = "Avant / Après",
  className = "",
  initial = 50,
}: Props) {
  const [value, setValue] = useState<number>(Math.min(100, Math.max(0, initial)));
  const uid = useId();

  // On révèle la partie "APRÈS" sur la gauche, en couvrant le reste
  const clipAfter = useMemo(() => `inset(0 ${100 - value}% 0 0)`, [value]);

  return (
    <div className={`relative w-full overflow-hidden rounded-3xl ${className}`}>
      <div className="relative h-[520px] sm:h-[620px] w-full ">
        {/* AVANT (base) - visible partout */}
        <Image
          src={beforeSrc}
          alt={alt}
          fill
          className="object-cover object-[center_15%]"
          sizes="(max-width: 768px) 100vw, 900px"
        />

        {/* APRÈS (clippé) - apparait à gauche selon le slider */}
        <div className="absolute inset-0" style={{ clipPath: clipAfter }}>
          <Image
            src={afterSrc}
            alt={alt}
            fill
            className="object-cover object-[center_15%]"
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>

        {/* Labels */}
        <div className="pointer-events-none absolute left-4 top-4 rounded-full /60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          Avant
        </div>
        <div className="pointer-events-none absolute right-4 top-4 rounded-full /60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          Après
        </div>

        {/* Handle */}
        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${value}%` }}>
          <div className="absolute inset-y-0 -translate-x-1/2 w-[2px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-900" aria-hidden>
                <path
                  fill="currentColor"
                  d="M8.12 12l3.95-3.95-1.41-1.41L5.29 12l5.37 5.36 1.41-1.41L8.12 12zm7.76 0l-3.95 3.95 1.41 1.41L18.71 12l-5.37-5.36-1.41 1.41L15.88 12z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Range input (interaction) */}
        <label htmlFor={uid} className="sr-only">
          Avant / Après
        </label>
        <input
          id={uid}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
          aria-label="Avant / Après"
        />
      </div>
    </div>
  );
}
