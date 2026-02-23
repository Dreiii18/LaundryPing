export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-light px-6 py-12 lg:px-8">
      {children}
    </div>
  );
}
