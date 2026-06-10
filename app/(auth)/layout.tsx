export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="paper-grid flex flex-1 items-center justify-center px-6 py-16">
      {children}
    </main>
  );
}
