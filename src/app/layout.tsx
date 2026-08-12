import type { Metadata } from "next";
import { Space_Grotesk, Sora, Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import AuthProvider from "@/components/AuthProvider";
import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ToastStack from "@/components/ToastStack";
import DevModeBanner from "@/components/DevModeBanner";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "RealCraft AI — Create Cinematic Stories from Text",
  description: "Turn a text prompt into a cinematic 3D story video in seconds.",
  keywords: "AI story generator, text to video, cinematic story generator, animated story maker, cinematic AI video creator",
  openGraph: {
    title: "RealCraft AI — Create Cinematic Stories from Text",
    description: "Turn a text prompt into a cinematic 3D story video in seconds.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RealCraft AI — Create Cinematic Stories from Text",
    description: "Turn a text prompt into a cinematic 3D story video in seconds.",
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
              name: "RealCraft AI",
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
          <DevModeBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
