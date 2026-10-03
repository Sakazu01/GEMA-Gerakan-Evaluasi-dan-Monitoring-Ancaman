export function DataStatePanel({loading,error,updatedAt,empty=false,retry}:{loading:boolean;error:string|null;updatedAt?:string|null;empty?:boolean;retry:()=>void}) {
  return <div role="status" className="space-y-2 text-sm text-slate-700">
    {loading&&<p>Memuat laporan…</p>}
    {error&&<div className="rounded-lg border border-amber-700 bg-amber-50 p-3"><p>{updatedAt?"Data belum diperbarui. Menampilkan data terakhir.":"Data belum dapat dimuat."} {error}</p><button type="button" onClick={retry} className="gema-button mt-2">Coba lagi</button></div>}
    {updatedAt&&<p>Data terakhir: {new Date(updatedAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"short",timeStyle:"short"})} WIB</p>}
    {!loading&&!error&&empty&&<p>Belum ada laporan aktif yang sesuai area ini. Ini bukan jaminan kondisi aman.</p>}
  </div>;
}
