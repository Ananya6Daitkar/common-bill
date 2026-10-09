import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Common Bill — Make an evening of it",
  description:
    "A shared planning desk for cinemas and bookshops. Cultural evidence, practical constraints, and an event both partners can stand behind.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to workspace
        </a>
        {children}
      </body>
    </html>
  );
}
