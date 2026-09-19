import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haven",
  description: "Haven — silent crisis intake and responder briefing.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>H</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-100 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
