import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Errands",
  description: "A quiet notes app.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>H</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#17181c] text-stone-100 antialiased">{children}</body>
    </html>
  );
}
