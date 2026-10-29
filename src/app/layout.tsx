import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { LeadStoreProvider } from "@/lib/store/LeadStore";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "MK Studios Dashboard", template: "%s · MK Studios Dashboard" },
  description: "Vind bedrijven, bekijk hun website en houd je leads bij.",
  icons: { icon: "/MK.png" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
        <LeadStoreProvider>
          <ThemeSync />
          <AppShell>{children}</AppShell>
        </LeadStoreProvider>
      </body>
    </html>
  );
}
