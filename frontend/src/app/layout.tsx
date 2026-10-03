import type { Metadata } from "next";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/role-context";
import { DemoReportProvider } from "@/lib/demo-report-context";
import { RoleSwitcher } from "@/components/RoleSwitcher";

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
          {/* Placeholder tombol asisten/chatbot -- belum ada logika di baliknya,
              cuma ditaruh dulu sesuai permintaan, dibangun nanti kalau sempat. */}
          <button
            type="button"
            aria-label="Asisten GEMA (segera hadir)"
            className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg"
          >
            <Image src="/G.svg" alt="" width={28} height={28} />
          </button>
        </RoleProvider>
      </body>
    </html>
  );
}
