import {defineConfig,devices} from "@playwright/test";

export default defineConfig({
  testDir:"./tests/e2e",
  timeout:30000,
  fullyParallel:true,
  workers:2,
  reporter:"list",
  use:{baseURL:"http://127.0.0.1:3100",trace:"retain-on-failure"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{
    command:"node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url:"http://127.0.0.1:3100",
    reuseExistingServer:false,
    timeout:60000,
    env:{NEXT_PUBLIC_API_URL:"http://127.0.0.1:18000",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:19000",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test",NEXT_PUBLIC_DEMO_MODE:"false"},
  },
});
