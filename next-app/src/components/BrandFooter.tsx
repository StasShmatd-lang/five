const INSTAGRAM_URL =
  "https://www.instagram.com/st.shmidt?mdxt=emx1MzR3dmN0MmZx&utm_source=qr";

export function BrandFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "mt-6 flex justify-center pb-1 pt-3" : "mt-12 flex justify-center pb-2 pt-6"}>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-2 opacity-70 transition hover:opacity-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Schmidt" width={120} height={40} className="h-8 w-auto" />
        <span className="text-xs tracking-wide" style={{ color: "var(--mute)" }}>
          instagram.com/st.shmidt
        </span>
      </a>
    </footer>
  );
}
