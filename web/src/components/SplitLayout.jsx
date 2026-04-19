export default function SplitLayout({ children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <div className="hidden lg:flex items-center justify-center bg-softinsa-gradient relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 1px, transparent 1px 22px), repeating-linear-gradient(-45deg, rgba(255,255,255,.08) 0 1px, transparent 1px 22px)',
          }}
        />
        <div className="relative text-center text-white px-10">
          <div className="text-6xl font-extrabold tracking-tight drop-shadow">SOFTINSA</div>
          <div className="mt-2 text-2xl font-bold">Plataforma de badges</div>
        </div>
      </div>
    </div>
  );
}
