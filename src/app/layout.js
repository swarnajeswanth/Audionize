import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import BlueDots from "../components/BlueDots";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Audionize - Real-time Audio Sync",
  description:
    "Synchronize audio playback across multiple devices in real-time with LAN and Internet support",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BlueDots />
        <div className="content-layer">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
