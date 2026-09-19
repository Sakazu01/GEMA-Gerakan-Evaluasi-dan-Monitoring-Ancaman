"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type Source = { id: string; label: string };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };
type ChatResponse = { answer: string; sources: Source[] };

const suggestions = [
  "Berapa laporan hari ini?",
  "Berapa laporan banjir?",
  "Tampilkan laporan terbaru.",
];

export function GemaChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Halo! Saya GEMA AI. Tanyakan jumlah atau ringkasan laporan warga yang sudah tercatat. Laporan ini belum diverifikasi.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    const message = question.trim();
    if (!message || loading) return;
    const history = messages.slice(1).slice(-6).map((item) => ({
      role: item.role,
      content: item.content.slice(0, 500),
    }));
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const result = await apiFetch<ChatResponse>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      setMessages((current) => [...current, {
        role: "assistant", content: result.answer, sources: result.sources,
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: error instanceof Error ? error.message : "Chatbot sedang tidak tersedia. Coba lagi nanti.",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        aria-label="Buka GEMA AI" aria-haspopup="dialog"
        className="fixed right-4 bottom-20 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-[#0D5D3A]/20 bg-white shadow-lg hover:bg-slate-50">
        <Image src="/G.svg" alt="" width={28} height={28} />
      </button>
    );
  }

  return (
    <section role="dialog" aria-label="GEMA AI" aria-modal="false"
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
      className="fixed right-4 bottom-20 z-[60] flex h-[min(620px,calc(100dvh-112px))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center gap-3 bg-[#0D5D3A] px-4 py-3 text-white">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
          <Image src="/G.svg" alt="" width={25} height={25} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">GEMA AI</h2>
          <p className="text-xs text-white/85">Data laporan warga · belum diverifikasi</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Tutup GEMA AI"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/10">
          <X aria-hidden="true" size={22} />
        </button>
      </header>

      <div ref={logRef} role="log" aria-live="polite" aria-label="Percakapan GEMA AI"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F7F6E4]/35 px-4 py-5">
        {messages.map((item, index) => (
          <div key={index} className={item.role === "user" ? "flex justify-end" : "flex items-start gap-2"}>
            {item.role === "assistant" && (
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0D5D3A]/20 bg-white">
                <Image src="/G.svg" alt="" width={18} height={18} />
              </span>
            )}
            <div className={item.role === "user"
              ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[#0D5D3A] px-4 py-3 text-sm leading-relaxed text-white"
              : "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-900"}>
              <p className="whitespace-pre-wrap">{item.content}</p>
              {item.sources && item.sources.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-slate-300 pt-2">
                  {item.sources.map((source) => (
                    <li key={source.id}>
                      <Link href={"/report/" + source.id} className="font-semibold text-[#0D5D3A] underline underline-offset-2">
                        Lihat laporan: {source.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div aria-label="Contoh pertanyaan" className="space-y-2 pl-10">
            {suggestions.map((question) => (
              <button key={question} type="button" onClick={() => void send(question)}
                className="block min-h-11 w-full rounded-xl border border-[#0D5D3A]/30 bg-white px-3 py-2 text-left text-sm font-medium text-[#0D5D3A] hover:bg-[#0D5D3A]/5">
                {question}
              </button>
            ))}
          </div>
        )}
        {loading && <p role="status" className="pl-10 text-sm text-slate-600">GEMA AI sedang memeriksa laporan…</p>}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void send(input); }}
        className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
        <label htmlFor="gema-chat-input" className="sr-only">Pertanyaan untuk GEMA AI</label>
        <input ref={inputRef} id="gema-chat-input" type="text" value={input} maxLength={500}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tanya tentang laporan..."
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#0D5D3A] focus:outline-none" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Kirim pertanyaan"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#0D5D3A] text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Send aria-hidden="true" size={18} />
        </button>
      </form>
    </section>
  );
}
