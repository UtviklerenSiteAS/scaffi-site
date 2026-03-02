import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900">
          <span className="text-xs font-bold text-white">S</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          Scaffi
        </span>
      </Link>
      {children}
    </div>
  );
}
