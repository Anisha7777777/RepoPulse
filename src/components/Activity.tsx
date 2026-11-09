import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchCommitActivity } from '../services/github';
import { groupCommits } from '../utils/analytics';
import type { Commit, Repository } from '../types/github';
import type { ActivitySummary } from '../types/snapshot';

const ranges = [7, 30, 90] as const;

export default function Activity({repository,onSummary}: {repository:Repository;onSummary:(summary:ActivitySummary|null)=>void}) {
  const [days, setDays] = useState<(typeof ranges)[number]>(30);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setCommits([]);
    fetchCommitActivity(repository.full_name, days, controller.signal)
      .then(({commits:returned,hasMore:more}) => {
        if (!controller.signal.aborted) {setCommits(returned);setHasMore(more);}
      })
      .catch((cause:unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load commit activity.');
      })
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [repository.full_name,days]);

  const daily = groupCommits(commits,days);
  const counted = daily.reduce((total,day) => total+day.commits,0);

  useEffect(() => {
    onSummary(loading||error ? null : {count:counted,days,partial:hasMore});
  }, [loading,error,counted,days,hasMore,onSummary]);

  return <section className="activity-panel" aria-labelledby="activity-title">
    <div className="activity-heading"><div><div className="section-kicker">03 / COMMIT ACTIVITY</div><h2 id="activity-title">Recent activity</h2></div><div className="range-picker" role="group" aria-label="Activity date range">{ranges.map(range => <button key={range} type="button" className={days===range?'selected':''} aria-pressed={days===range} onClick={()=>setDays(range)}>{range} days</button>)}</div></div>
    <p className="activity-explainer">Commits returned by GitHub, grouped by UTC date over the last {days} days. Counts include up to the first 100 returned commits.</p>
    {loading ? <div className="activity-message" role="status">Loading {days}-day commit activity…</div> : error ? <div className="activity-message activity-error" role="alert">Commit activity is unavailable: {error} The repository overview remains available.</div> : commits.length===0 ? <div className="activity-message" role="status">No accessible commits were returned for the last {days} days.{hasMore?' More pages exist on GitHub, so this is a partial result.':''}</div> : <>
      <div className="activity-summary"><strong>{counted.toLocaleString()}</strong><span>commits in returned sample · last {days} days</span></div>
      <div className="activity-chart" role="img" aria-label={`Bar chart of ${counted} returned commits grouped by date over the last ${days} days`}><ResponsiveContainer width="100%" height="100%"><BarChart data={daily} margin={{top:10,right:8,left:-20,bottom:0}}><CartesianGrid vertical={false} stroke="#e5e6df"/><XAxis dataKey="date" tick={{fontSize:10,fill:'#777972'}} minTickGap={days===90?32:18} tickFormatter={(value:string)=>value.slice(5)}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'#777972'}}/><Tooltip labelFormatter={(value)=>String(value)} formatter={(value)=>[value,'Commits']}/><Bar dataKey="commits" fill="#607a39" radius={[2,2,0,0]} maxBarSize={22}/></BarChart></ResponsiveContainer></div>
      <p className="activity-note">{hasMore?'Partial result: GitHub has more pages for this period. This chart counts the first 100 returned commits, so some days may be undercounted.':'GitHub returned one page for this period; the chart reflects the accessible commits in that response.'}</p>
    </>}
  </section>;
}
