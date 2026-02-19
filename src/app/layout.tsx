import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { loadSettings, ACCENT_PRESETS } from "@/lib/settings";
import { ClientProviders } from "@/components/providers/ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const settings = loadSettings();
const accent = ACCENT_PRESETS[settings.accentColor] || ACCENT_PRESETS.green;

export const metadata: Metadata = {
  title: `${settings.name} — ${settings.subtitle}`,
  description: `${settings.name} Agent Swarm Dashboard`,
};

export const viewport: Viewport = {
  themeColor: settings.theme === 'light' ? '#fafafa' : '#111113',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeClass = settings.theme === 'light' ? 'theme-light' : 'theme-dark';
  const isDark = settings.theme !== 'light';

  return (
    <html lang="en" className={themeClass} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t&&(t==='light'||t==='dark')){var h=document.documentElement;h.classList.remove('theme-light','theme-dark');h.classList.add('theme-'+t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
        style={{
          '--accent-primary': accent.primary,
          '--accent-primary-light': accent.primaryLight,
          '--accent-glow': accent.glow,
        } as React.CSSProperties}
      >
        {/* Subtle background gradient */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: settings.backgroundGradient.topLeft }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: settings.backgroundGradient.bottomRight }}
          />
        </div>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster
          theme={isDark ? "dark" : "light"}
          position="bottom-right"
          toastOptions={{
            style: isDark
              ? {
                  background: 'rgba(22, 22, 24, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }
              : {
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  backdropFilter: 'blur(12px)',
                },
          }}
        />
      </body>
    </html>
  );
}
