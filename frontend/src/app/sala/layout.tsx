import Header from '@/components/Header';

export default function SalaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cultivo-darker">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6 pb-20">
        {children}
      </main>
    </div>
  );
}

