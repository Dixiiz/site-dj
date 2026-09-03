"use client";

// Pad de signature : le client signe à la souris ou au doigt.
// La signature est envoyée en PNG (base64) avec le formulaire.
import { useRef, useState } from "react";

export function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a2f66";
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
    // On met à jour le champ caché avec l'image de la signature
    if (canvasRef.current && hiddenRef.current && hasInk) {
      hiddenRef.current.value = canvasRef.current.toDataURL("image/png");
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hiddenRef.current) hiddenRef.current.value = "";
    setHasInk(false);
  };

  return (
    <div className="mt-2">
      <div className="relative w-full max-w-sm rounded-lg border border-white/15 bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={150}
          className="h-[110px] w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Signez ici avec votre doigt ou la souris ✍️
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <input type="hidden" name="signature_data" ref={hiddenRef} />
        <button
          type="button"
          onClick={clear}
          className="text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          Effacer la signature
        </button>
      </div>
    </div>
  );
}
