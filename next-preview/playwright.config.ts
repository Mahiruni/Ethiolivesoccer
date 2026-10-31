import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',
 timeout:45000,
 retries:1,
 workers:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'android-360',use:{...devices['Pixel 5'],viewport:{width:360,height:780}}},
  {name:'android-390',use:{...devices['Pixel 5'],viewport:{width:390,height:844}}},
  {name:'android-430',use:{...devices['Pixel 5'],viewport:{width:430,height:932}}},
  {name:'tablet',use:{...devices['Desktop Chrome'],viewport:{width:768,height:1024},hasTouch:true,isMobile:true}},
  {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}}
 ],
 webServer:{command:'node node_modules/next/dist/bin/next start -p 3100',url:'http://127.0.0.1:3100/api/health',reuseExistingServer:!process.env.CI,timeout:120000},
 outputDir:'test-results'
});
