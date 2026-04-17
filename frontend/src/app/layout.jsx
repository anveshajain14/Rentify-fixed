import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/store/provider";
import { Toaster } from "react-hot-toast";
import { VisualEditsMessenger } from "orchids-visual-edits";
import AuthBootstrapper from "@/components/AuthBootstrapper";
import CartPersistence from "@/components/CartPersistence";
import ThemeScript from "@/components/ThemeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "LuxeRent | Premium Rental Marketplace",
  description: "Rent premium products from verified sellers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeScript />
        <ReduxProvider>
          {/* Rehydrate auth from secure cookie on app load so login survives refresh */}
          <AuthBootstrapper />
          {/* Keep carts scoped per-identity and persisted across reloads */}
          <CartPersistence />
          <div className="relative min-h-screen">
            {children}

            {/* Floating chatbot button (bottom-right) */}
            <a
              href="/assistant"
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 shadow-xl shadow-emerald-500/30 dark:shadow-cyan-500/30 hover:bg-emerald-600 dark:hover:bg-cyan-600 transition-colors text-sm font-bold"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
                {/* Simple chat bubble icon */}
                <span className="relative block h-3 w-4 rounded-md bg-primary-foreground">
                  <span className="absolute -bottom-1 left-1 h-2 w-2 rotate-45 bg-primary-foreground" />
                </span>
              </span>
              <span className="hidden sm:inline">Chat with assistant</span>
            </a>
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              className: '',
              style: {},
              success: { iconTheme: { primary: '#22c55e' } },
              error: { iconTheme: { primary: '#ef4444' } },
            }}
          />
        </ReduxProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
