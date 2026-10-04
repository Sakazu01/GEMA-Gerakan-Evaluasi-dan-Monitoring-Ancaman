import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans/index.css";
import "./globals.css";
import { RoleProvider } from "@/lib/role-context";
import { DemoReportProvider } from "@/lib/demo-report-context";
import { NearbyAlert } from "@/components/NearbyAlert";
import { GemaChatbot } from "@/components/GemaChatbot";

// Plus Jakarta Sans -- dibuat kolektif Indonesia untuk program Jakarta Smart City,
// dipilih agar identitas tipografi GEMA terasa "punya" (bukan default Geist/Inter
// generik), sekaligus tetap sangat terbaca di layar Android murah ukuran kecil.
// Font bundled locally: build and runtime do not fetch Google Fonts.

export const metadata: Metadata = {
  title: "GEMA",
  description: "Gerakan Evaluasi dan Monitoring Ancaman — laporan bencana dari warga",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RoleProvider>
          <DemoReportProvider>{children}</DemoReportProvider>
          <NearbyAlert />
          <GemaChatbot />
        </RoleProvider>
      </body>
    </html>
  );
}
