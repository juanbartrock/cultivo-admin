'use client';

import { Component, ReactNode } from 'react';
import Image from 'next/image';

export function SceneFallback() {
  return (
    <div className="relative h-full min-h-[420px] w-full bg-bg" data-testid="scene-fallback">
      <Image
        src="/images/carpa-flora-referencia.webp"
        alt="Vista frontal de referencia de la carpa Flora"
        fill
        className="object-cover opacity-80"
        sizes="(max-width: 1280px) 100vw, 70vw"
      />
      <div className="absolute inset-x-0 bottom-0 bg-bg/90 px-4 py-3 text-sm text-fg-muted">
        Vista 3D no disponible en este dispositivo. Los controles siguen disponibles en el inspector.
      </div>
    </div>
  );
}

export class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children;
  }
}
