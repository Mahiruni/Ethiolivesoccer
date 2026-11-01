import type {Metadata} from 'next';
import AccountCenter from '@/components/AccountCenter';
export const metadata:Metadata={title:'Your account',description:'Sign in or create an EthioLiveScores football account.'};
export default function AccountPage(){return <AccountCenter/>}
