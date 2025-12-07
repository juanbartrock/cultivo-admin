import { ReactNode } from 'react';

export default function SeguimientosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {children}
    </div>
  );
}
