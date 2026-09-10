import type { Metadata } from "next";
import "./globals.css";
import "./legacy.css";

export const metadata: Metadata = {
  title: {
    default: "HUKI EBOOK",
    template: "%s | HUKI EBOOK",
  },
  description: "Nền tảng khám phá, mua bán và kết nối cộng đồng sách HUKI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-[#f2fbf9] text-[#141d1c] font-sans antialiased selection:bg-[#ac2c19] selection:text-white">
        {children}
      </body>
    </html>
  );
}
