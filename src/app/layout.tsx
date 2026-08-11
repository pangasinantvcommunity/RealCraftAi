import type { Metadata } from "next";
import { Space_Grotesk, Sora, Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import AuthProvider from "@/components/AuthProvider";
import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ToastStack from "@/components/ToastStack";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Realcraft AI — Turn Your Voice Into a Cinematic Story",
  description:
    "Realcraft AI turns your voice into a cinematic 3D animated story video, ready for TikTok, Reels, and Shorts.",
  keywords: "AI story generator, voice to video, animated story maker, cinematic AI video creator",
  openGraph: {
    title: "Realcraft AI — Turn Your Voice Into a Cinematic Story",
    description: "Record a voice. Generate a 3D animated story. Share it instantly.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Realcraft AI",
    description: "Turn your voice into a cinematic story.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${sora.variable} ${inter.variable} bg-void`}>
      <body className="min-h-screen bg-void selection:bg-violet-500/40">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Realcraft AI",
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              description: "AI story generator that turns voice recordings into cinematic animated videos.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            }),
          }}
        />
        <AuthProvider session={session}>
          <SmoothScroll />
          <Nav />
          <main>{children}</main>
          <Footer />
          <ToastStack />
        </AuthProvider>
      </body>
    </html>
  );
}
