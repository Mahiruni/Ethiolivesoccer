import type { Metadata, Viewport } from 'next';
import './globals.css';
import SiteFrame from '@/components/SiteFrame';

export const metadata:Metadata={
  metadataBase:new URL('https://ethiolivesoccer.vercel.app'),
  title:{default:'Fetan | The Global Matchday',template:'%s | Fetan'},
  description:'Premium international football matchday coverage: Premier League, La Liga, Bundesliga, Serie A and Ligue 1 fixtures, reported scores and standings.',
  applicationName:'Fetan',
  openGraph:{title:'Fetan — The Global Matchday',description:'Football without the noise. The five major European leagues in one place.',type:'website'},
  robots:{index:false,follow:false},
};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#08090b',viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><SiteFrame>{children}</SiteFrame></body></html>;
}
