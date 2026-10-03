import {test,expect,type Page,type Route} from "@playwright/test";

const reportId="11111111-1111-4111-8111-111111111111";
const userId="22222222-2222-4222-8222-222222222222";
function fixture(){const now=new Date();return {id:reportId,type:"fire",reported_type:"fire",status:"active",verification_status:"unconfirmed",closure_reason:null,severity:"tinggi",ai_status:"relevant",ai_summary:"Terlihat asap pada foto.",location_label:"Area uji",location_source:"device",public_lat:-6.9,public_lng:107.6,published_at:now.toISOString(),created_at:now.toISOString(),observed_at:now.toISOString(),expires_at:new Date(now.getTime()+12*3600000).toISOString(),is_demo:false,responder_status:"PENDING",help_status:"belum_ada_konfirmasi",seen_count:0,not_seen_count:0,false_vote_count:0,version:2,observation_counts:{direct_seen_nearby:0,direct_not_observed_nearby:0,unsure:0,secondhand:0},awareness_radius_m:500};}
async function mockAuth(page:Page,anonymous=true){
  const exp=Math.floor(Date.now()/1000)+3600;
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const jwt=`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp,aud:"authenticated",role:"authenticated",is_anonymous:anonymous})}.test-signature`;
  await page.route("**/auth/v1/**",async route=>route.fulfill({json:{access_token:jwt,token_type:"bearer",expires_in:3600,expires_at:exp,refresh_token:"test-refresh",user:{id:userId,aud:"authenticated",role:"authenticated",is_anonymous:anonymous,app_metadata:{provider:anonymous?"anonymous":"email",providers:[anonymous?"anonymous":"email"]},user_metadata:{},created_at:new Date().toISOString()}}}));
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition:(success:PositionCallback)=>success({coords:{latitude:-6.9,longitude:107.6,accuracy:25,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()} as GeolocationPosition)}});
  });
  await page.route("https://*.tile.openstreetmap.org/**",route=>route.abort());
}
async function defaultApi(route:Route,report=fixture()){
  const url=new URL(route.request().url()),path=url.pathname;
  if(path==="/api/reports"&&route.request().method()==="GET")return route.fulfill({json:[report]});
  if(path==="/api/nearby")return route.fulfill({json:{location_valid:true,location_mode:"device",data_as_of:new Date().toISOString(),items:[{report_id:report.id,reported_type:report.type,observed_at:report.observed_at,distance_m:20,report}]}});
  if(path.endsWith("/observation"))return route.fulfill({json:route.request().method()==="GET"?null:{saved:true}});
  if(path==="/api/session")return route.fulfill({json:{user_id:userId,roles:[]}});
  if(path==="/api/my-reports")return route.fulfill({json:[report]});
  if(path===`/api/reports/${report.id}`)return route.fulfill({json:report});
  if(path.startsWith("/api/moderation"))return route.fulfill({status:403,json:{detail:"Akun tidak memiliki izin pengelola"}});
  return route.fulfill({json:{enabled:false}});
}

test.beforeEach(async({page})=>{await mockAuth(page);});

test("error data tidak berubah menjadi pesan kosong atau aman, lalu bisa dicoba lagi",async({page})=>{
  let failed=true;
  await page.route("**/api/**",route=>new URL(route.request().url()).pathname==="/api/reports"&&failed?route.fulfill({status:503,json:{detail:"Layanan data gagal"}}):defaultApi(route));
  await page.goto("/");
  await expect(page.getByText(/Data belum dapat dimuat/)).toBeVisible();
  await expect(page.getByText(/Belum ada laporan aktif yang sesuai/)).toHaveCount(0);
  failed=false;await page.getByRole("button",{name:"Coba lagi",exact:true}).click();
  await expect(page.getByRole("heading",{name:/Kebakaran/})).toBeVisible();
});

test("notice netral, unsure bukan bantahan, dan dismiss tidak hilang setelah reload",async({page})=>{
  const report=fixture();let observation:unknown;
  await page.route("**/api/**",async route=>{
    if(route.request().method()==="PUT"&&route.request().url().endsWith("/observation"))observation=route.request().postDataJSON();
    return defaultApi(route,report);
  });
  await page.goto("/");await page.getByRole("button",{name:"Gunakan / perbarui lokasi saya"}).click();
  await expect(page.getByRole("heading",{name:"Ada laporan kebakaran di sekitar lokasi Anda"})).toBeVisible();
  await page.getByRole("button",{name:"Beri pengamatan",exact:true}).click();
  await page.getByRole("radio",{name:"Saya belum tahu / tidak bisa memastikan"}).check();
  await page.getByRole("button",{name:"Simpan pengamatan",exact:true}).click();
  await expect(page.getByText("Pengamatan Anda tersimpan. Ini membantu peninjauan laporan.")).toBeVisible();
  expect(observation).toMatchObject({value:"unsure",source:null,observed_at:null,observer_location:null});
  await page.getByRole("button",{name:"Sembunyikan 30 menit"}).click();
  await page.reload();await page.getByRole("button",{name:"Gunakan / perbarui lokasi saya"}).click();
  await expect(page.getByRole("heading",{name:"Ada laporan kebakaran di sekitar lokasi Anda"})).toHaveCount(0);
});

test("laporan manual tersimpan sebelum submit, double click tidak menggandakan pengiriman",async({page})=>{
  const events:string[]=[];let payload:Record<string,unknown>|null=null;let draftId="";
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){
      events.push("draft");draftId=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||reportId;
      return route.fulfill({json:{draft_id:draftId,ai_status:"not_requested"}});
    }
    if(path==="/api/reports"&&route.request().method()==="POST"){
      events.push("submit");payload=route.request().postDataJSON();
      expect(route.request().headers()["idempotency-key"]).toBeTruthy();
      return route.fulfill({json:{id:draftId,status:"held",verification_status:"under_review"}});
    }
    return defaultApi(route);
  });
  await page.goto("/report/new");await page.getByRole("button",{name:"Gunakan lokasi perangkat",exact:true}).click();
  await page.getByLabel("Nama area").fill("Lokasi uji manual");
  await page.getByRole("button",{name:"Kirim laporan",exact:true}).dblclick();
  await expect(page.getByRole("heading",{name:"Laporan tercatat"})).toBeVisible();
  await expect(page.getByText(/Belum ditampilkan kepada warga sekitar/)).toBeVisible();
  expect(events).toEqual(["draft","submit"]);expect(payload).toMatchObject({photo_source:"none",reported_type:"flood",observation_time_known:true});
});

test("draft offline bertahan setelah reload dan dikirim satu kali saat koneksi kembali",async({page,context})=>{
  let draftId="";let submissions=0;
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){draftId=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||reportId;return route.fulfill({json:{draft_id:draftId}});}
    if(path==="/api/reports"&&route.request().method()==="POST"){submissions++;return route.fulfill({json:{id:draftId,status:"held"}});}
    return defaultApi(route);
  });
  await page.goto("/report/new");await page.getByRole("button",{name:"Gunakan lokasi perangkat",exact:true}).click();
  await page.getByLabel("Nama area").fill("Draft koneksi rendah");
  await context.setOffline(true);await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();
  await expect(page.getByText("Draft tersimpan di perangkat dan menunggu koneksi. Belum terkirim.")).toBeVisible();
  await context.setOffline(false);await page.reload();await page.getByRole("link",{name:"Kembali ke beranda",exact:true}).click();
  await expect(page.getByText(/Draft terkirim. Status: sedang ditinjau/)).toBeVisible();
  expect(submissions).toBe(1);
  await page.reload();await expect(page.getByRole("heading",{name:"Draft tersimpan di perangkat",exact:true})).toHaveCount(0);expect(submissions).toBe(1);
});

test("warga tidak melihat antrean moderator; tracker hanya menyatakan penerimaan",async({page})=>{
  await page.route("**/api/**",route=>defaultApi(route,{...fixture(),responder_status:"ACCEPTED"}));
  await page.goto("/pengelola");await expect(page.getByText("Akun tidak memiliki izin pengelola")).toBeVisible();
  await expect(page.getByRole("link",{name:"Tinjau laporan"})).toHaveCount(0);
  await page.goto("/track");await expect(page.getByText("Respons: Laporan diterima responder")).toBeVisible();
  await expect(page.getByText("Petugas Menuju Lokasi",{exact:true})).toHaveCount(0);
});

test("drawer menjebak dan mengembalikan fokus serta tidak menyebabkan overflow mobile",async({page})=>{
  await page.route("**/api/**",route=>defaultApi(route));await page.setViewportSize({width:360,height:800});
  await page.goto("/");const menu=page.getByRole("button",{name:"Buka menu",exact:true});await menu.click();
  const dialog=page.getByRole("dialog",{name:"Menu utama"});await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button",{name:"Tutup menu",exact:true})).toBeFocused();
  await page.keyboard.press("Shift+Tab");await expect(dialog.getByRole("link",{name:"Masuk pengelola"})).toBeFocused();
  await page.keyboard.press("Escape");await expect(menu).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("menghapus foto yang sudah dianalisis membuat draft manual baru",async({page})=>{
  const drafts:string[]=[];let payload:Record<string,unknown>|null=null;
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){
      const id=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||reportId;drafts.push(id);
      return route.fulfill({json:{draft_id:id}});
    }
    if(path.endsWith("/analyze"))return route.fulfill({json:{draft_id:drafts.at(-1),ai_status:"relevant",type:"flood",severity:"rendah",summary:"Terlihat genangan."}});
    if(path==="/api/reports"&&route.request().method()==="POST"){payload=route.request().postDataJSON();return route.fulfill({json:{id:drafts.at(-1),status:"held"}});}
    return defaultApi(route);
  });
  await page.goto("/report/new");
  const image=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=10;canvas.height=10;canvas.getContext("2d")!.fillRect(0,0,10,10);return canvas.toDataURL("image/png").split(",")[1];});
  await page.getByLabel("Pilih foto",{exact:true}).setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from(image,"base64")});
  await page.getByRole("button",{name:"Analisis foto (opsional)"}).click();
  await expect(page.getByText("Jenis menurut AI: Banjir")).toBeVisible();
  await page.getByRole("button",{name:"Lanjut tanpa foto"}).click();
  await page.getByRole("button",{name:"Gunakan lokasi perangkat",exact:true}).click();
  await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Laporan tercatat"})).toBeVisible();
  expect(drafts).toHaveLength(2);expect(drafts[0]).not.toBe(drafts[1]);expect(payload).toMatchObject({draft_id:drafts[1],photo_source:"none"});
});

test("penutupan laporan memperbarui notice meskipun sebelumnya disembunyikan",async({page})=>{
  let closed=false;const report=fixture();
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(closed&&path==="/api/nearby")return route.fulfill({json:{location_valid:true,location_mode:"device",data_as_of:new Date().toISOString(),items:[]}});
    if(closed&&path===`/api/reports/${reportId}`)return route.fulfill({json:{...report,status:"closed",closure_reason:"refuted",public_verification_note:"Bukti waktu berbeda; informasi ditutup."}});
    return defaultApi(route,report);
  });
  await page.goto("/");await page.getByRole("button",{name:"Gunakan / perbarui lokasi saya"}).click();
  await page.getByRole("button",{name:"Sembunyikan 30 menit"}).click();
  closed=true;await page.evaluate(()=>window.dispatchEvent(new Event("gema:reports-changed")));
  await expect(page.getByRole("heading",{name:"Pembaruan laporan sebelumnya"})).toBeVisible();
  await expect(page.getByText("Bukti waktu berbeda; informasi ditutup.")).toBeVisible();
});

test("jawaban tidak melihat memerlukan konteks; informasi warlok tetap secondhand",async({page})=>{
  const observations:unknown[]=[];
  await page.route("**/api/**",route=>{
    if(route.request().method()==="PUT")observations.push(route.request().postDataJSON());
    return defaultApi(route);
  });
  await page.goto("/");await page.getByRole("button",{name:"Gunakan / perbarui lokasi saya"}).click();
  await page.getByRole("button",{name:"Beri pengamatan",exact:true}).click();
  await page.getByRole("radio",{name:"Saya berada di lokasi kejadian dan tidak melihat tanda tersebut"}).check();
  await page.getByRole("button",{name:"Simpan pengamatan",exact:true}).click();expect(observations).toHaveLength(0);
  await page.getByRole("checkbox",{name:"Saya memang berada di lokasi yang dimaksud pada waktu pengamatan ini."}).check();
  await page.getByLabel("Catatan (wajib menjelaskan konteks)").fill("Saya berada di sisi timur area dan tidak melihat asap.");
  await page.getByRole("button",{name:"Simpan pengamatan",exact:true}).click();
  await expect(page.getByText("Pengamatan Anda tersimpan. Ini membantu peninjauan laporan.")).toBeVisible();
  expect(observations[0]).toMatchObject({value:"not_observed",at_report_location:true});
  await page.getByRole("radio",{name:"Saya melihat tanda kejadian"}).check();await page.getByLabel("Sumber informasi").selectOption("secondhand");
  await page.getByRole("button",{name:"Ubah pengamatan",exact:true}).click();
  await expect.poll(()=>observations.length).toBe(2);expect(observations[1]).toMatchObject({value:"seen",source:"secondhand",observer_location:null});
});

test("detail mengikuti koreksi dan menghapus tampilan lama ketika laporan tidak lagi publik",async({page})=>{
  const report=fixture();let state="active";
  await page.route("**/api/**",route=>{
    if(new URL(route.request().url()).pathname===`/api/reports/${reportId}`){
      if(state==="held")return route.fulfill({status:404,json:{detail:"Laporan tidak tersedia"}});
      if(state==="closed")return route.fulfill({json:{...report,status:"closed",closure_reason:"refuted",public_verification_note:"Koreksi informasi terbaru."}});
    }
    return defaultApi(route,report);
  });
  await page.goto(`/report/${reportId}`);await expect(page.getByRole("button",{name:"Beri pengamatan",exact:true})).toBeVisible();
  state="closed";await page.evaluate(()=>window.dispatchEvent(new Event("gema:reports-changed")));
  await expect(page.getByText("Koreksi informasi terbaru.")).toBeVisible();await expect(page.getByRole("button",{name:"Beri pengamatan",exact:true})).toHaveCount(0);
  state="held";await page.evaluate(()=>window.dispatchEvent(new Event("gema:reports-changed")));
  await expect(page.getByText(/Laporan tidak tersedia pada tampilan ini/)).toBeVisible();
  await expect(page.getByRole("heading",{name:"Kebakaran — Area uji"})).toHaveCount(0);
});

function privateFixture(report=fixture()){
  return {report,photo_url:"https://photos.example.test/private.jpg",description:"Keterangan privat pelapor uji",risk_flags:["photo_reused"],lat:-6.91234,lng:107.61234,
    observations:[],abuse_reports:[],audit:[],outbox:[{id:reportId,channel:"telegram",state:"unknown",attempts:1,last_error_code:"network_unknown"}]};
}

test("pengelola meninjau versi terbaru setelah konflik dan menyimpan keputusan beralasan",async({page})=>{
  await mockAuth(page,false);let report={...fixture(),status:"held",verification_status:"under_review"};const decisions:Record<string,unknown>[]=[];
  let conflict=true;
  await page.route("https://photos.example.test/**",route=>route.abort());
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/moderation/reports")return route.fulfill({json:[report]});
    if(path===`/api/moderation/reports/${reportId}`)return route.fulfill({json:privateFixture(report)});
    if(path.endsWith("/decisions")){
      const payload=route.request().postDataJSON();decisions.push(payload);
      if(conflict){conflict=false;report={...report,version:3};return route.fulfill({status:409,json:{code:"version_conflict"}});}
      report={...report,status:"active",verification_status:"confirmed",version:4};return route.fulfill({json:report});
    }
    return defaultApi(route,report);
  });
  await page.goto("/pengelola");await page.getByRole("link",{name:"Lihat laporan",exact:true}).click();
  await expect(page.getByText("Keterangan pelapor: Keterangan privat pelapor uji")).toBeVisible();
  await page.getByRole("combobox",{name:"Tindakan",exact:true}).selectOption("confirm");
  await page.getByLabel("Alasan berdasarkan bukti (privat)").fill("Bukti waktu dan pengamatan langsung diperiksa oleh pengelola.");
  await page.getByLabel("Catatan untuk publik (opsional; tanpa identitas privat)").fill("Pengamatan terbaru telah ditinjau.");
  await page.getByRole("button",{name:"Simpan keputusan dan audit"}).click();
  await expect(page.getByRole("status").filter({hasText:"Laporan berubah sejak Anda membukanya"})).toBeVisible();
  expect(decisions[0]).toMatchObject({action:"confirm",expected_version:2});
  await page.getByRole("button",{name:"Perbarui data / foto"}).click();
  await expect(page.getByText(/Versi yang ditinjau: 3/)).toBeVisible();
  await page.getByRole("button",{name:"Simpan keputusan dan audit"}).click();
  await expect(page.getByText("Keputusan tersimpan dalam audit.")).toBeVisible();
  expect(decisions[1]).toMatchObject({action:"confirm",expected_version:3,public_note:"Pengamatan terbaru telah ditinjau."});
});

test("penolakan akses menghapus data privat dan respons lama tidak memunculkannya lagi",async({page})=>{
  await mockAuth(page,false);let requests=0,oldFinished=false;let release=()=>{};
  const waiting=new Promise<void>(resolve=>{release=resolve;});
  await page.route("https://photos.example.test/**",route=>route.abort());
  await page.route("**/api/**",async route=>{
    if(new URL(route.request().url()).pathname===`/api/moderation/reports/${reportId}`){
      requests++;
      if(requests===2){await waiting;await route.fulfill({json:privateFixture()});oldFinished=true;return;}
      if(requests>=3)return route.fulfill({status:403,json:{detail:"Izin pengelola telah dicabut"}});
      return route.fulfill({json:privateFixture()});
    }
    return defaultApi(route);
  });
  await page.goto(`/pengelola/${reportId}`);
  await expect(page.getByText("Keterangan pelapor: Keterangan privat pelapor uji")).toBeVisible();
  await page.getByRole("button",{name:"Perbarui data / foto"}).click();await expect.poll(()=>requests).toBe(2);
  await page.getByRole("button",{name:"Perbarui data / foto"}).click();
  await expect(page.getByText("Izin pengelola telah dicabut")).toBeVisible();
  release();await expect.poll(()=>oldFinished).toBe(true);
  await expect(page.getByText("Keterangan pelapor: Keterangan privat pelapor uji")).toHaveCount(0);
  await expect(page.getByRole("img",{name:"Foto privat untuk peninjauan"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Simpan keputusan dan audit"})).toHaveCount(0);
});

test("respons detail lama tidak menimpa koreksi ketersediaan terbaru",async({page})=>{
  let requests=0,oldFinished=false;let release=()=>{};const waiting=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/api/**",async route=>{
    if(new URL(route.request().url()).pathname===`/api/reports/${reportId}`){
      requests++;
      if(requests===2){await waiting;await route.fulfill({json:fixture()});oldFinished=true;return;}
      if(requests>=3)return route.fulfill({status:404,json:{detail:"Laporan tidak tersedia"}});
    }
    return defaultApi(route);
  });
  await page.goto(`/report/${reportId}`);await expect(page.getByRole("heading",{name:"Kebakaran — Area uji"})).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event("gema:reports-changed")));await expect.poll(()=>requests).toBe(2);
  await page.evaluate(()=>window.dispatchEvent(new Event("gema:reports-changed")));
  await expect(page.getByText(/Laporan tidak tersedia pada tampilan ini/)).toBeVisible();
  release();await expect.poll(()=>oldFinished).toBe(true);
  await expect(page.getByRole("heading",{name:"Kebakaran — Area uji"})).toHaveCount(0);
});

test("penolakan izin saat menyimpan keputusan juga menghapus konteks privat",async({page})=>{
  await mockAuth(page,false);
  await page.route("https://photos.example.test/**",route=>route.abort());
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path===`/api/moderation/reports/${reportId}`)return route.fulfill({json:privateFixture()});
    if(path.endsWith("/decisions"))return route.fulfill({status:403,json:{code:"forbidden",detail:"forbidden"}});
    return defaultApi(route);
  });
  await page.goto(`/pengelola/${reportId}`);
  await page.getByLabel("Alasan berdasarkan bukti (privat)").fill("Konteks bukti sedang ditinjau oleh pengelola.");
  await page.getByRole("button",{name:"Simpan keputusan dan audit"}).click();
  await expect(page.getByText("Akun tidak memiliki izin untuk tindakan ini.",{exact:true})).toBeVisible();
  await expect(page.getByText("Keterangan pelapor: Keterangan privat pelapor uji")).toHaveCount(0);
  await expect(page.getByRole("img",{name:"Foto privat untuk peninjauan"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Simpan keputusan dan audit"})).toHaveCount(0);
});

test("pengamatan menunggu data lama; perubahan ke warlok tidak mengirim koordinat dan dapat dicabut",async({page})=>{
  let release=()=>{};const waiting=new Promise<void>(resolve=>{release=resolve;});const saves:Record<string,unknown>[]=[];let withdrawals=0;
  await page.route("**/api/**",async route=>{
    if(route.request().url().endsWith("/observation")){
      if(route.request().method()==="GET"){await waiting;return route.fulfill({json:null});}
      if(route.request().method()==="PUT")saves.push(route.request().postDataJSON());
      if(route.request().method()==="DELETE")withdrawals++;
    }
    return defaultApi(route);
  });
  await page.goto(`/report/${reportId}`);await page.getByRole("button",{name:"Beri pengamatan",exact:true}).click();
  await expect(page.getByRole("radio",{name:"Saya melihat tanda kejadian"})).toBeDisabled();release();
  await page.getByRole("radio",{name:"Saya melihat tanda kejadian"}).check();
  await page.getByRole("button",{name:"Sertakan perkiraan lokasi perangkat (opsional)"}).click();
  await expect(page.getByText("Lokasi digunakan untuk konteks pengamatan dan tidak dibuka ke publik.")).toBeVisible();
  await page.getByRole("button",{name:"Simpan pengamatan",exact:true}).click();
  await expect(page.getByRole("button",{name:"Ubah pengamatan",exact:true})).toBeVisible();
  expect(saves[0]).toMatchObject({source:"direct",observer_location:{lat:-6.9,lng:107.6}});
  await page.getByLabel("Sumber informasi").selectOption("secondhand");
  await expect(page.getByRole("button",{name:"Sertakan perkiraan lokasi perangkat (opsional)"})).toHaveCount(0);
  await page.getByRole("button",{name:"Ubah pengamatan",exact:true}).click();
  await expect.poll(()=>saves.length).toBe(2);expect(saves[1]).toMatchObject({source:"secondhand",observer_location:null});
  await page.getByRole("button",{name:"Cabut pengamatan",exact:true}).click();
  await expect(page.getByText("Pengamatan dicabut.")).toBeVisible();expect(withdrawals).toBe(1);
});

test("preferensi push memerlukan pilihan area dan menyimpan serta mencabut subscription",async({page})=>{
  const subscriptions:Record<string,unknown>[]=[];let deletions=0;
  await page.addInitScript(()=>{
    const events:string[]=[];Object.defineProperty(window,"pushEvents",{value:events});
    const sub={endpoint:"https://fcm.googleapis.com/browser-test",toJSON:()=>({endpoint:"https://fcm.googleapis.com/browser-test",keys:{p256dh:"test-key",auth:"test-auth"}}),unsubscribe:async()=>{events.push("unsubscribe");return true;}};
    const registration={pushManager:{getSubscription:async()=>sub,subscribe:async()=>sub}};
    Object.defineProperty(window,"PushManager",{value:class {}});
    Object.defineProperty(window,"Notification",{value:{requestPermission:async()=>{events.push("permission");return "granted";}}});
    Object.defineProperty(navigator,"serviceWorker",{value:{register:async()=>registration,ready:Promise.resolve(registration),getRegistration:async()=>registration}});
  });
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/push/config")return route.fulfill({json:{enabled:true,public_key:Buffer.from([4,...Array(64).fill(1)]).toString("base64url")}});
    if(path==="/api/push/subscriptions"){
      if(route.request().method()==="POST")subscriptions.push(route.request().postDataJSON());else deletions++;
      return route.fulfill({json:{saved:true}});
    }
    return defaultApi(route);
  });
  await page.goto("/");await page.getByText("Preferensi notifikasi",{exact:true}).click();
  await page.getByRole("button",{name:"Aktifkan / perbarui area"}).click();await expect(page.getByText("Pilih area pemantauan dahulu.")).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {pushEvents:string[]}).pushEvents)).toEqual([]);
  await page.getByRole("button",{name:"Gunakan / perbarui lokasi saya"}).click();
  await page.getByRole("button",{name:"Aktifkan / perbarui area"}).click();
  await expect(page.getByText(/Notifikasi aktif untuk area pilihan/)).toBeVisible();
  expect(subscriptions[0]).toMatchObject({location_mode:"device",accuracy_m:25,lat:-6.9,lng:107.6});
  await page.getByRole("button",{name:"Nonaktifkan",exact:true}).click();await expect(page.getByText("Notifikasi dinonaktifkan.")).toBeVisible();expect(deletions).toBe(1);
  expect(await page.evaluate(()=>(window as unknown as {pushEvents:string[]}).pushEvents)).toEqual(["permission","unsubscribe"]);
});

test("mengubah foto setelah submit gagal tidak memakai bukti server sebelumnya",async({page})=>{
  const drafts:string[]=[],submissions:Record<string,unknown>[]=[];
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){
      const id=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||reportId;drafts.push(id);return route.fulfill({json:{draft_id:id}});
    }
    if(path.endsWith("/analyze"))return route.fulfill({json:{draft_id:drafts.at(-1),ai_status:"relevant",type:"flood",severity:"rendah",summary:"Terlihat genangan."}});
    if(path==="/api/reports"&&route.request().method()==="POST"){
      submissions.push(route.request().postDataJSON());
      if(submissions.length===1)return route.fulfill({status:503,json:{detail:"Pengiriman belum dapat dipastikan."}});
      return route.fulfill({json:{id:drafts.at(-1),status:"held"}});
    }
    return defaultApi(route);
  });
  await page.goto("/report/new");
  const image=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=10;canvas.height=10;canvas.getContext("2d")!.fillRect(0,0,10,10);return canvas.toDataURL("image/png").split(",")[1];});
  await page.getByLabel("Pilih foto",{exact:true}).setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from(image,"base64")});
  await page.getByRole("button",{name:"Gunakan lokasi perangkat",exact:true}).click();
  await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();await expect(page.getByText("Pengiriman belum dapat dipastikan.")).toBeVisible();
  await page.getByRole("button",{name:"Lanjut tanpa foto"}).click();await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Laporan tercatat"})).toBeVisible();
  expect(drafts).toHaveLength(2);expect(drafts[0]).not.toBe(drafts[1]);
  expect(submissions[1]).toMatchObject({draft_id:drafts[1],photo_source:"none"});
});

test("draft server kedaluwarsa dipulihkan sekali tanpa mengubah waktu pengamatan",async({page})=>{
  const observed=new Date(Date.now()-48*3600000).toISOString();let freshId="";const submissions:Record<string,unknown>[]=[];const keys:string[]=[];
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){
      freshId=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||"";return route.fulfill({json:{draft_id:freshId}});
    }
    if(path==="/api/reports"&&route.request().method()==="POST"){
      submissions.push(route.request().postDataJSON());keys.push(route.request().headers()["idempotency-key"]);
      if(submissions.length===1)return route.fulfill({status:409,json:{code:"draft_expired"}});
      return route.fulfill({json:{id:freshId,status:"held"}});
    }
    return defaultApi(route);
  });
  await page.goto("/about");
  await page.evaluate(async({id,observed})=>{
    await new Promise<void>((resolve,reject)=>{
      const request=indexedDB.open("gema-private-drafts",1);
      request.onupgradeneeded=()=>request.result.createObjectStore("drafts",{keyPath:"id"});
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,transaction=db.transaction("drafts","readwrite");
        transaction.objectStore("drafts").put({id,serverId:id,photo:null,photoSource:"none",type:"flood",observedAt:observed,timeKnown:true,
          location:{lat:-6.9,lng:107.6,source:"map",label:"Area lama"},locationLabel:"Area lama",description:"Pengamatan asli dua hari lalu",details:null,
          createdAt:observed,updatedAt:new Date().toISOString(),queued:true});
        transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);
      };
    });
  },{id:reportId,observed});
  await page.goto("/");await expect(page.getByText("Draft terkirim. Status: sedang ditinjau.")).toBeVisible();
  expect(freshId).toBeTruthy();expect(freshId).not.toBe(reportId);expect(submissions).toHaveLength(2);
  expect(submissions[1]).toMatchObject({draft_id:freshId,observed_at:observed,observation_time_known:true});expect(keys).toEqual([reportId,reportId]);
});

test("retry form setelah gagal mempertahankan draft server dan payload identik",async({page})=>{
  let draftCount=0,draftId="";const submissions:Record<string,unknown>[]=[];const keys:string[]=[];
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){
      draftCount++;draftId=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||reportId;
      return route.fulfill({json:{draft_id:draftId}});
    }
    if(path==="/api/reports"&&route.request().method()==="POST"){
      submissions.push(route.request().postDataJSON());keys.push(route.request().headers()["idempotency-key"]);
      if(submissions.length===1)return route.fulfill({status:503,json:{detail:"Koneksi pengiriman terputus setelah draft tersimpan."}});
      return route.fulfill({json:{id:draftId,status:"held"}});
    }
    return defaultApi(route);
  });
  await page.goto("/report/new");await page.getByRole("button",{name:"Gunakan lokasi perangkat",exact:true}).click();
  await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();
  await expect(page.getByText("Koneksi pengiriman terputus setelah draft tersimpan.")).toBeVisible();
  await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Laporan tercatat"})).toBeVisible();
  expect(draftCount).toBe(1);expect(submissions).toHaveLength(2);expect(submissions[1]).toEqual(submissions[0]);expect(keys[1]).toBe(keys[0]);
});

test("draft server yang sudah dihapus dapat dibuat ulang setelah warga memeriksa hasilnya",async({page})=>{
  const drafts:string[]=[],submissions:Record<string,unknown>[]=[];
  await page.route("**/api/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/reports/drafts"){
      const id=route.request().postData()?.match(/name="client_id"\r\n\r\n([a-f0-9-]+)/)?.[1]||reportId;drafts.push(id);return route.fulfill({json:{draft_id:id}});
    }
    if(path==="/api/reports"&&route.request().method()==="POST"){
      submissions.push(route.request().postDataJSON());
      if(submissions.length===1)return route.fulfill({status:404,json:{code:"report_not_found"}});
      return route.fulfill({json:{id:drafts.at(-1),status:"held"}});
    }
    return defaultApi(route);
  });
  await page.goto("/report/new");await page.getByRole("button",{name:"Gunakan lokasi perangkat",exact:true}).click();
  await page.getByLabel("Nama area").fill("Area pemulihan draft");await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();
  await expect(page.getByText(/Periksa Laporan Saya terlebih dahulu/)).toBeVisible();expect(drafts).toHaveLength(1);
  await page.getByRole("button",{name:"Buat draft baru dari data ini"}).click();
  await expect(page.getByText(/Draft baru tersimpan di perangkat. Waktu pengamatan asli tetap dipakai/)).toBeVisible();
  expect(drafts).toHaveLength(1); // Recreating locally does not submit without another user action.
  await page.getByRole("button",{name:"Kirim laporan",exact:true}).click();await expect(page.getByRole("heading",{name:"Laporan tercatat"})).toBeVisible();
  expect(drafts).toHaveLength(2);expect(drafts[0]).not.toBe(drafts[1]);
  expect(submissions[1]).toMatchObject({location_label:"Area pemulihan draft",observed_at:submissions[0].observed_at});
});
