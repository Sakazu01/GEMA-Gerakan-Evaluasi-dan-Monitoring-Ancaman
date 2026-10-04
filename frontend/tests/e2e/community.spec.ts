import {test,expect,type Page,type Route} from "@playwright/test";

const acceptedId="11111111-1111-4111-8111-111111111111";
const pendingId="33333333-3333-4333-8333-333333333333";
const userId="22222222-2222-4222-8222-222222222222";

function report(id=acceptedId,responder="ACCEPTED"){
  const now=new Date();return {id,type:"fire",reported_type:"fire",status:"active",verification_status:"unconfirmed",closure_reason:null,
    severity:"tinggi",ai_status:"relevant",ai_summary:"Terlihat api dan asap pada area terbuka.",ai_confidence:"tinggi",ai_limitations:"Sudut foto terbatas.",
    provenance_status:"complete",internal_match_count:0,web_match_count:0,location_label:"Area uji",location_source:"device",public_lat:-6.9,public_lng:107.6,
    published_at:now.toISOString(),created_at:now.toISOString(),observed_at:now.toISOString(),expires_at:new Date(now.getTime()+12*3600000).toISOString(),
    is_demo:false,responder_status:responder,help_status:"belum_ada_konfirmasi",seen_count:0,not_seen_count:0,false_vote_count:0,version:2,
    observation_counts:{direct_seen_nearby:0,direct_not_observed_nearby:0,unsure:0,secondhand:0},awareness_radius_m:500};
}

async function mockBrowser(page:Page,anonymous=true){
  const exp=Math.floor(Date.now()/1000)+3600;
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const jwt=`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp,aud:"authenticated",role:"authenticated",is_anonymous:anonymous})}.test-signature`;
  await page.route("**/auth/v1/**",route=>route.fulfill({json:{access_token:jwt,token_type:"bearer",expires_in:3600,expires_at:exp,refresh_token:"test-refresh",user:{id:userId,aud:"authenticated",role:"authenticated",is_anonymous:anonymous,app_metadata:{provider:anonymous?"anonymous":"email",providers:[anonymous?"anonymous":"email"]},user_metadata:{},created_at:new Date().toISOString()}}}));
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition:(success:PositionCallback)=>success({coords:{latitude:-6.9,longitude:107.6,accuracy:25,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()} as GeolocationPosition)}});
    Object.defineProperty(navigator,"mediaDevices",{value:{getUserMedia:async()=>{
      const canvas=document.createElement("canvas");canvas.width=32;canvas.height=32;canvas.getContext("2d")!.fillStyle="#f00";canvas.getContext("2d")!.fillRect(0,0,32,32);
      return canvas.captureStream(1);
    }}});
    Object.defineProperty(HTMLVideoElement.prototype,"videoWidth",{get:()=>32});
    Object.defineProperty(HTMLVideoElement.prototype,"videoHeight",{get:()=>32});
  });
  await page.route("https://*.tile.openstreetmap.org/**",route=>route.abort());
}

async function defaultApi(route:Route){
  const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
  const accepted=report(),pending=report(pendingId,"PENDING");
  if(path==="/api/reports"&&method==="GET")return route.fulfill({json:[accepted]});
  if(path==="/api/reports/density")return route.fulfill({json:[]});
  if(path==="/api/nearby")return route.fulfill({json:{location_valid:true,location_mode:"device",data_as_of:new Date().toISOString(),items:[{report_id:pending.id,reported_type:pending.type,observed_at:pending.observed_at,distance_m:120,verification_status:"unconfirmed",notice_kind:"observation_invitation",report:pending}]}});
  if(path.endsWith("/observation")&&method==="GET")return route.fulfill({json:null});
  if(path.endsWith("/observation")&&method==="PUT")return route.fulfill({json:{saved:true,confirm_count:1,false_count:0,community_disputed:false}});
  if(path==="/api/push/config")return route.fulfill({json:{enabled:false,public_key:null}});
  if(path===`/api/reports/${acceptedId}`)return route.fulfill({json:accepted});
  if(path===`/api/reports/${pendingId}`)return route.fulfill({json:pending});
  if(path.startsWith("/api/moderation"))return route.fulfill({status:403,json:{detail:"Akses petugas diperlukan"}});
  return route.fulfill({json:{}});
}

async function takePhoto(page:Page){
  await page.getByRole("button",{name:"Buka kamera"}).click();
  await expect(page.getByRole("button",{name:"Ambil foto"})).toBeVisible();
  await page.getByRole("button",{name:"Ambil foto"}).click();
  await expect(page.getByAltText("Pratinjau foto kamera")).toBeVisible();
}

test.beforeEach(async({page})=>{await mockBrowser(page);});

test("beranda meminta lokasi, peta hanya memuat laporan diterima, dan pending tampil sebagai notice",async({page})=>{
  await page.route("**/api/**",defaultApi);
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Kejadian di sekitar Anda"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Ada laporan kebakaran di sekitar lokasi Anda"})).toBeVisible();
  await expect(page.getByText("Area uji").first()).toBeVisible();
  await expect(page.getByRole("link",{name:"Laporkan Bencana"})).toBeVisible();
});

test("alur laporan hanya memakai kamera dan satu submit menjalankan draft, AI, lalu publish",async({page})=>{
  const events:string[]=[];let submitted:Record<string,unknown>|null=null;
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname,method=route.request().method();
    if(path==="/api/reports/drafts"){events.push("draft");return route.fulfill({json:{draft_id:pendingId,ai_status:"not_requested"}});}
    if(path.endsWith("/analyze")){events.push("analyze");return route.fulfill({json:{draft_id:pendingId,ai_status:"relevant",type:"fire",severity:"tinggi",summary:"Terlihat api.",confidence:"tinggi"}});}
    if(path==="/api/reports"&&method==="POST"){events.push("publish");submitted=route.request().postDataJSON();return route.fulfill({json:{id:pendingId,status:"active",verification_status:"unconfirmed"}});}
    return defaultApi(route);
  });
  await page.goto("/report/new");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText(/Tidak tersedia pilihan galeri/)).toBeVisible();
  await takePhoto(page);
  await page.getByLabel("Keterangan tambahan (opsional)").fill("Api terlihat membesar dekat pepohonan.");
  await page.getByLabel("Nama area").fill("Kantor uji");
  await page.getByRole("button",{name:"Laporkan",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Laporan tercatat"})).toBeVisible();
  expect(events).toEqual(["draft","analyze","publish"]);
  expect(submitted).toMatchObject({photo_source:"camera",observation_time_known:true,reported_type:"fire",location_label:"Kantor uji"});
});

test("cooldown backend ditampilkan kepada pelapor",async({page})=>{
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname,method=route.request().method();
    if(path==="/api/reports/drafts")return route.fulfill({json:{draft_id:pendingId}});
    if(path.endsWith("/analyze"))return route.fulfill({json:{draft_id:pendingId,ai_status:"unavailable"}});
    if(path==="/api/reports"&&method==="POST")return route.fulfill({status:429,headers:{"Retry-After":"120"},json:{detail:"Terlalu banyak permintaan. Coba lagi setelah jeda.",code:"http_429",retry_after_seconds:120}});
    return defaultApi(route);
  });
  await page.goto("/report/new");await takePhoto(page);await page.getByRole("button",{name:"Laporkan",exact:true}).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Terlalu banyak permintaan");
});

test("warga radius 500 meter memilih Palsu dengan lokasi perangkat dan alasan",async({page})=>{
  let payload:Record<string,unknown>|null=null;
  await page.route("**/api/**",async route=>{
    if(route.request().method()==="PUT"&&route.request().url().endsWith("/observation")){payload=route.request().postDataJSON();return route.fulfill({json:{saved:true,confirm_count:2,false_count:6,community_disputed:true}});}
    return defaultApi(route);
  });
  await page.goto("/");await page.getByRole("button",{name:"Beri pengamatan"}).click();
  await page.getByRole("radio",{name:/Palsu/}).check();
  await page.getByLabel("Keterangan (wajib)").fill("Saya memeriksa area dan tidak menemukan api atau asap.");
  await page.getByRole("button",{name:"Perbarui lokasi untuk verifikasi"}).click();
  await page.getByRole("button",{name:"Kirim tanggapan"}).click();
  await expect(page.getByText(/ditandai diragukan/)).toBeVisible();
  expect(payload).toMatchObject({value:"not_observed",source:"direct",at_report_location:true,observer_location:{lat:-6.9,lng:107.6,accuracy_m:25}});
});

test("foto notice hanya dibuka setelah pemeriksaan lokasi 500 meter",async({page})=>{
  await page.route("https://photos.example.test/**",route=>route.abort());
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith("/nearby-evidence"))return route.fulfill({json:{description:"Api terlihat dari sisi timur.",photo_url:"https://photos.example.test/private.jpg",photo_unavailable:false}});
    return defaultApi(route);
  });
  await page.goto(`/report/${pendingId}`);
  await page.getByRole("button",{name:"Buka foto dengan verifikasi lokasi 500 m"}).click();
  await expect(page.getByText("Keterangan warga: Api terlihat dari sisi timur.")).toBeVisible();
  await expect(page.getByAltText("Foto laporan di sekitar")).toBeVisible();
});

test("dashboard pemerintah hanya menampilkan riwayat dan bukti",async({page})=>{
  await mockBrowser(page,false);
  const accepted=report();
  await page.route("https://photos.example.test/**",route=>route.abort());
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==="/api/moderation/reports")return route.fulfill({json:[accepted]});
    if(path===`/api/moderation/reports/${acceptedId}`)return route.fulfill({json:{report:accepted,photo_url:"https://photos.example.test/private.jpg",photo_unavailable:false,description:"Keterangan petugas",risk_flags:[],lat:-6.9,lng:107.6,internal_matches:[],web_matches:[],observations:[],abuse_reports:[],audit:[],outbox:[],incident:[]}});
    return defaultApi(route);
  });
  await page.goto("/pengelola");
  await expect(page.getByRole("heading",{name:"Riwayat laporan pemerintah"})).toBeVisible();
  await page.getByRole("link",{name:"Lihat laporan"}).click();
  await expect(page.getByText("Halaman ini bersifat baca saja")).toBeVisible();
  await expect(page.getByRole("button",{name:/Simpan keputusan/})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Kemiripan dengan laporan GEMA"})).toBeVisible();
});
