import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compound | UK ETF Investment Calculator",
  description:
    "Interactive UK ETF projected-growth calculator and historical monthly-investment backtester.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
