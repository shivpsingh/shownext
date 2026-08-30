import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { SmoothScroll } from "../components/SmoothScroll";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "ShowNext — Help, right when they need it",
  description: "ShowNext is an early Android guide that helps parents find the next step on their screen.",
  openGraph: {
    title: "ShowNext — Help, right when they need it",
    description: "A calmer way to help your parents through the small technology moments that get them stuck.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8faff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={roboto.variable}>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
