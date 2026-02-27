"use client";

import { useEffect, useRef } from "react";

interface LiveWaveformProps {
  active: boolean;
}

export default function LiveWaveform({ active }: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const barsRef   = useRef<number[]>(Array.from({ length: 80 }, () => Math.random()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx.clearRect(0, 0, W, H);

      barsRef.current = barsRef.current.map((v) => {
        if (!active) return v * 0.97 + 0.01 * Math.random();
        const delta = (Math.random() - 0.5) * 0.18;
        return Math.max(0.05, Math.min(1, v + delta));
      });

      const barW = W / barsRef.current.length;
      barsRef.current.forEach((v, i) => {
        const h = v * (H * 0.85);
        const x = i * barW;
        const y = (H - h) / 2;
        const r = Math.round(255 * Math.min(1, v * 2));
        const g = Math.round(255 * Math.min(1, (1 - v) * 2));
        ctx.fillStyle = `rgb(${r},${g},30)`;
        ctx.fillRect(x + 1, y, Math.max(1, barW - 2), h);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={120}
      className="w-full h-full"
    />
  );
}
