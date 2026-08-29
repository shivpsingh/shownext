import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ShowNext — Help, right when they need it", description: "ShowNext is an early Android guide that helps parents find the next step on their screen.", openGraph: { title: "ShowNext — Help, right when they need it", description: "A calmer way to help your parents through the small technology moments that get them stuck.", type: "website" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
