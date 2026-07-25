import "./globals.css";

export const metadata = {
  title: "MULTIPLY Creator OS",
  description: "MULTIPLY 沙龍社群內容作業系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
