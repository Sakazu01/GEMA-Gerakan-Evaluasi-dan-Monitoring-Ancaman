import type { Report, ResponderStatus } from "@/types/report";

// Muat pertama kali hanya menjadi baseline; popup muncul untuk transisi baru.
export function hasNewAcceptance(
  previous: ReadonlyMap<string, ResponderStatus> | null,
  current: readonly Pick<Report, "id" | "responder_status">[],
): boolean {
  return previous !== null && current.some((report) =>
    previous.get(report.id) === "PENDING" && report.responder_status === "ACCEPTED"
  );
}
