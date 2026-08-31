import type { Metadata, Viewport } from "next";
import { Fira_Sans, Overlock, PT_Sans } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { SmoothScroll } from "../components/SmoothScroll";
import "./globals.css";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pt-sans",
});

const overlock = Overlock({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-overlock",
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fira-sans",
});

export const metadata: Metadata = {
  title: "ShowNext — Help, right when they need it",
  description: "ShowNext is an early Android guide that helps parents find the next step on their screen.",
  icons: { icon: "/show-next-icon.png" },
  openGraph: {
    title: "ShowNext — Help, right when they need it",
    description: "A calmer way to help your parents through the small technology moments that get them stuck.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${ptSans.variable} ${overlock.variable} ${firaSans.variable}`}>
        <ConvexClientProvider>
          <SmoothScroll />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
