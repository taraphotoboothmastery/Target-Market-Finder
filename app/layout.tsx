import "./globals.css";

export const metadata = {
  title: "Target Market Finder",
  description: "Find your ideal wedding and corporate clients, backed by your own data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
