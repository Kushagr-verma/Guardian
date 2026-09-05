import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Guardian — AI Risk Control",
  description:
    "Guardian converts natural-language fraud intent into constrained, measurable and optimized risk policies.",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f7f5",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}