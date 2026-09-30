import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/role-context";
import { DemoReportProvider } from "@/lib/demo-report-context";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { GemaChatbot } from "@/components/GemaChatbot";

// Plus Jakarta Sans -- dibuat kolektif Indonesia untuk program Jakarta Smart City,
// dipilih agar identitas tipografi GEMA terasa "punya" (bukan default Geist/Inter
// generik), sekaligus tetap sangat terbaca di layar Android murah ukuran kecil.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GEMA",
  description: "Gerakan Evaluasi dan Monitoring Ancaman — laporan bencana dari warga",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RoleProvider>
          <DemoReportProvider>{children}</DemoReportProvider>
          <RoleSwitcher />
          <GemaChatbot />
        </RoleProvider>
      </body>
    </html>
  );
}
