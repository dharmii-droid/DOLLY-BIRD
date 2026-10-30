import "./globals.css";

export const metadata = {
  title: "DOLLY BIRD",
  description: "A personalised Flappy-style arcade game."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
