import MatchCenter from './MatchCenter';
import CompetitionHub from './CompetitionHub';
import NewsHub from './NewsHub';
export default function HomePage({ lang='en', onNeedAuth }) { return <><MatchCenter onNeedAuth={onNeedAuth}/><div className="page home-extras"><CompetitionHub lang={lang} compact/><NewsHub lang={lang} compact/></div></>; }
