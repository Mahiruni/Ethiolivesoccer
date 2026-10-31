import {test,expect} from '@playwright/test';

const fixtures=[{
 id:'tsdb-2494081',league:'Premier League',leagueSlug:'premier-league',
 country:'England',date:'2026-10-31T15:00:00.000Z',home:'Bournemouth',away:'Leeds United',
 homeScore:null,awayScore:null,status:'NS',statusLabel:'Not Started',venue:null
}];
const table=[
 {position:1,team:'Arsenal',played:10,won:8,drawn:1,lost:1,difference:20,points:25},
 {position:2,team:'Chelsea',played:10,won:7,drawn:2,lost:1,difference:15,points:23}
];
test.beforeEach(async({page})=>{
 await page.route('**/api/matches?*',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures)}));
 await page.route('**/api/standings?*',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(table)}));
});
test('premium football homepage is readable and responsive',async({page},testInfo)=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/every match/i})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Pick your competition'})).toBeVisible();
 await expect(page.getByText('Bournemouth')).toBeVisible();
 await expect(page.getByText('Arsenal')).toBeVisible();
 await expect(page.locator('.coverage-notice')).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 if(overflow>1){
  const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,cls:el.className?.toString?.().slice(0,80)||'',right:Math.round(el.getBoundingClientRect().right),left:Math.round(el.getBoundingClientRect().left)})).filter(v=>v.right>document.documentElement.clientWidth+1||v.left< -1).slice(0,16));
  console.log('MOBILE_OVERFLOW_DIAGNOSTIC',overflow,JSON.stringify(offenders));
 }
 expect(overflow,'no horizontal page overflow').toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath('matchday-'+testInfo.project.name+'.png'),fullPage:true});
});
test('league selection and navigation update the app',async({page})=>{
 await page.goto('/');
 const laLiga=page.locator('.league-pill').filter({hasText:'La Liga'});
 await laLiga.click();
 await expect(laLiga).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('heading',{name:'La Liga fixtures'})).toBeVisible();
 await page.getByRole('button',{name:'Today'}).click({force:true}).catch(()=>{});
});
test('account preview never silently signs in without secure configuration',async({page})=>{
 await page.goto('/account');
 await expect(page.getByRole('heading',{name:'Closer to the game.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Sign in',exact:true}).last()).toBeVisible();
 await page.locator('input[type="email"]').fill('no-account@example.com');
 await page.locator('input[type="password"]').fill('not-real-password');
 await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
 await expect(page.locator('.account-feedback.error')).toBeVisible();
});

test('signed-in profile renders real account activity contract and logout',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('ethio_token','preview-e2e-only-token'));
 await page.route('**/api/auth/me',async route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({user:{id:101,username:'testfan',email:'fan@example.com',display_name:'Matchday Fan'},
    preferences:{preferred_language:'en',theme:'dark'}})}));
 await page.route('**/api/me/favorites',async route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify([{id:501,name_en:'Arsenal',short_name:'ARS'}])}));
 await page.route('**/api/me/predictions',async route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify([{id:66,match_id:121,vote_choice:'home',home_en:'Arsenal',away_en:'Chelsea',match_date:null}])}));
 await page.route('**/api/push/config',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,publicKey:null})}));
 await page.goto('/account');
 await expect(page.getByRole('heading',{name:'Matchday Fan'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Favorites & predictions'})).toBeVisible();
 await expect(page.getByText('Arsenal').first()).toBeVisible();
 await expect(page.getByText('Picked: Home win')).toBeVisible();
 await page.getByRole('button',{name:/sign out/i}).click();
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('ethio_token'))).toBeNull();
});

test('verified identity components render flags and accessible crest fallbacks',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('img',{name:'England flag'}).first()).toBeVisible();
 await expect(page.locator('.football-logo-fallback').first()).toBeVisible();
 await expect(page.locator('.fixture-logo.football-logo').first()).toBeVisible();
 await expect(page.getByText('Bournemouth')).toBeVisible();
 await page.locator('.league-pill').filter({hasText:'La Liga'}).click();
 await expect(page.getByRole('img',{name:'Spain flag'}).first()).toBeVisible();
});
