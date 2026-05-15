import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Generated Fashion Models | SareeViz",
  description:
    "Turn your saree, apparel, and jewelry designs into studio-quality model photos in minutes with SareeViz AI.",
  keywords: [
    "ai fashion models",
    "ai model generator",
    "saree photoshoot",
    "jewelry photography",
    "virtual photoshoot",
    "fashion ai",
    "product photography",
  ],
  openGraph: {
    title: "AI Generated Fashion Models",
    description:
      "Turn your saree, ethnic wear, and jewelry designs into studio-quality model photos in minutes.",
    url: "https://sareeviz.com",
    siteName: "SareeViz",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Generated Fashion Models",
    description:
      "Turn your saree, ethnic wear, and jewelry designs into studio-quality model photos in minutes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, playfair.variable)}>
      <body className="antialiased font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
