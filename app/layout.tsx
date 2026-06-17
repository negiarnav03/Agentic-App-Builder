import type { Metadata } from "next";
import {Lora, DM_Sans} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";

const lora = Lora({
  subsets: ['latin'],
  weight:["400", "500"],
  style:["normal","italic"],
  variable: "--font-serif",
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight:["400","500","600"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Agentic App Builder",
  description: "Create beautiful, modern, responsive, AI-powered websites with ease. Design visually, and let the AI handle the code.",
  icons:{
    icon: "/logo-short.jpeg"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${lora.variable} ${dmSans.variable} font-sans`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <Header/>
            <main>
              {children}
            </main>
          </ThemeProvider>
      </body>
    </html>
  );
}
