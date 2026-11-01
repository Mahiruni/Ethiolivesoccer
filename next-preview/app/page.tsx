import type { Metadata } from 'next';
import Matchday from '@/components/Matchday';
export const metadata:Metadata={title:'Matchday',description:'International football fixtures, reported scores and partial free league standings.'};
export default function Home(){return <Matchday/>}