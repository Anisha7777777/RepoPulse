import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { fetchAttentionItems } from '../services/github';
import type { AttentionItem, Repository } from '../types/github';
import type { AttentionSummary } from '../types/snapshot';

type ItemFilter = 'all' | 'issue' | 'pull request';
const thresholds = [7, 14, 30] as const;
const displayDate = (value:string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString() : 'Unavailable date';

export default function Attention({repository,onSummary}: {repository:Repository;onSummary:(summary:AttentionSummary|null)=>void}) {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [days, setDays] = useState<(typeof thresholds)[number]>(7);
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItems([]);
    fetchAttentionItems(repository.full_name, controller.signal)
      .then(({items:returned,hasMore:more}) => {
        if (!controller.signal.aborted) {setItems(returned);setHasMore(more);}
      })
      .catch((cause:unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load open items.');
      })
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [repository.full_name,retry]);

  const cutoff = Date.now()-days*86400000;
  const matching = items.filter(item => {
    const updated = Date.parse(item.updated_at);
    const type:ItemFilter = item.pull_request ? 'pull request' : 'issue';
    return Number.isFinite(updated) && updated <= cutoff && (filter==='all' || filter===type);
  });

  useEffect(() => {
    onSummary(loading||error ? null : {count:matching.length,days,filter,partial:hasMore});
  }, [loading,error,matching.length,days,filter,hasMore,onSummary]);

  return <section className="attention-panel" aria-labelledby="attention-title">
    <div className="attention-heading"><div><div className="section-kicker">04 / MAINTAINER ATTENTION</div><h2 id="attention-title">Attention inbox</h2></div></div>
    <p className="attention-explainer">Open items with no GitHub updates for at least {days} days. An update can come from anyone; this is a review cue, not proof that a maintainer has missed an item.</p>
    <div className="attention-controls"><div className="range-picker" role="group" aria-label="Minimum days without updates">{thresholds.map(value=><button type="button" key={value} className={days===value?'selected':''} aria-pressed={days===value} onClick={()=>setDays(value)}>{value}+ days</button>)}</div><div className="range-picker" role="group" aria-label="Item type">{(['all','issue','pull request'] as const).map(value=><button type="button" key={value} className={filter===value?'selected':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'All':value==='issue'?'Issues':'Pull requests'}</button>)}</div></div>
    {loading ? <div className="attention-message" role="status">Loading open issues and pull requests…</div> : error ? <div className="attention-message attention-error" role="alert"><span>Attention inbox unavailable: {error}</span><button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></div> : <>
      <p className="attention-count">{matching.length} matching {matching.length===1?'item':'items'} in the returned page</p>
      {matching.length===0 ? <div className="attention-message" role="status">No {filter==='all'?'open items':filter==='issue'?'open issues':'open pull requests'} match this threshold in the returned page.{hasMore?' More pages exist on GitHub, so this is a partial result.':''}</div> : <ul className="attention-list">{matching.map(item=>{const type=item.pull_request?'Pull request':'Issue';return <li key={item.id} className="attention-item"><div><span className="attention-type">{type} #{item.number}</span><a href={item.html_url} target="_blank" rel="noreferrer">{item.title} <ArrowUpRight size={13}/></a><span className="attention-meta">By {item.user?.login||'Unknown author'} · Opened {displayDate(item.created_at)} · Updated {displayDate(item.updated_at)}</span></div><span className="attention-reason">No updates for {days}+ days</span></li>})}</ul>}
      <p className="attention-note">{hasMore?'Partial result: GitHub has more pages. This inbox checks only the first 100 open items, sorted by oldest update.':'GitHub returned one page of open items, sorted by oldest update.'} Changing filters or the threshold uses this returned page without another request.</p>
    </>}
  </section>;
}
