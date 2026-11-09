import { useState } from 'react';
import { readSnapshots, writeSnapshots } from '../services/snapshots';
import type { Repository } from '../types/github';
import type { ActivitySummary, AttentionSummary, RepositorySnapshot } from '../types/snapshot';

interface Props {
  repositoryName:string;
  liveRepository:Repository|null;
  activity:ActivitySummary|null;
  attention:AttentionSummary|null;
}

const availableNumber=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)?value:null;
const captured=(value:string)=>new Date(value).toLocaleString();
const count=(value:number|null)=>value===null?'Unavailable':value.toLocaleString();
const change=(earlier:number|null,later:number|null)=>earlier===null||later===null?'Unavailable':`${later-earlier>0?'+':''}${(later-earlier).toLocaleString()}`;

export default function Snapshots({repositoryName,liveRepository,activity,attention}:Props) {
  const [savedOnLoad]=useState(readSnapshots);
  const [snapshots,setSnapshots]=useState<RepositorySnapshot[]>(savedOnLoad.snapshots);
  const [storageWarning,setStorageWarning]=useState(savedOnLoad.warning);
  const [storageError,setStorageError]=useState('');
  const [feedback,setFeedback]=useState('');
  const [earlierId,setEarlierId]=useState('');
  const [laterId,setLaterId]=useState('');
  const current=snapshots.filter(item=>item.repository.toLowerCase()===repositoryName.toLowerCase()).sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
  const earlier=current.find(item=>item.id===earlierId)??current[1];
  const later=current.find(item=>item.id===laterId)??current[0];
  const comparable=earlier&&later&&earlier.id!==later.id&&Date.parse(earlier.capturedAt)<Date.parse(later.capturedAt);

  function persist(next:RepositorySnapshot[],successMessage:string) {
    try {writeSnapshots(next);setSnapshots(next);setStorageError('');setStorageWarning('');setFeedback(successMessage);}
    catch {setFeedback('');setStorageError('Browser storage is unavailable or full. No snapshot change was saved.');}
  }

  function save() {
    if(!liveRepository)return;
    const snapshot:RepositorySnapshot={
      id:crypto.randomUUID(),repository:liveRepository.full_name,capturedAt:new Date().toISOString(),
      stars:availableNumber(liveRepository.stargazers_count),
      forks:availableNumber(liveRepository.forks_count),
      openIssues:availableNumber(liveRepository.open_issues_count),
      activity,attention
    };
    persist([snapshot,...snapshots],`Snapshot saved for ${liveRepository.full_name} at ${captured(snapshot.capturedAt)}.`);
  }

  function remove(id:string){persist(snapshots.filter(item=>item.id!==id),'Snapshot deleted from this browser.');}
  function clearAll(){if(window.confirm('Delete all saved RepoPulse snapshots for every repository in this browser?'))persist([],'All saved snapshots were deleted from this browser.');}

  return <section className="snapshot-panel" aria-labelledby="snapshot-title">
    <div className="snapshot-heading"><div><div className="section-kicker">05 / LOCAL HISTORY</div><h2 id="snapshot-title">Saved snapshots</h2><p>{repositoryName}</p></div><button type="button" className="snapshot-save" disabled={!liveRepository} onClick={save}>Save current snapshot</button></div>
    <p className="snapshot-explainer">A snapshot is a point-in-time capture in this browser. It never updates automatically. Missing activity or inbox data is saved as unavailable.</p>
    {!liveRepository&&<p className="snapshot-note">Live details are unavailable right now. You can still compare or delete saved snapshots for {repositoryName}.</p>}
    {storageWarning&&<p className="snapshot-note" role="status">{storageWarning}</p>}
    {storageError&&<p className="snapshot-error" role="alert">{storageError}</p>}
    {feedback&&<p className="snapshot-feedback" role="status">{feedback}</p>}
    {current.length===0?<div className="snapshot-empty">No saved snapshots for this repository yet. Search it live, then save a capture.</div>:<>
      <ul className="snapshot-list">{current.map(item=><li key={item.id}><div><strong>{captured(item.capturedAt)}</strong><span>Stars {count(item.stars)} · Forks {count(item.forks)} · Open issues + PRs {count(item.openIssues)}</span></div><button type="button" onClick={()=>remove(item.id)} aria-label={`Delete snapshot from ${captured(item.capturedAt)}`}>Delete</button></li>)}</ul>
    </>}
    {snapshots.length>0&&<button type="button" className="snapshot-clear" onClick={clearAll}>Clear all saved snapshots</button>}
    <div className="snapshot-compare"><h3>Compare saved captures</h3>{current.length<2?<p className="snapshot-note">Save at least two snapshots of {repositoryName} to compare them.</p>:<>
      <div className="snapshot-selectors"><label>Earlier snapshot<select value={earlier?.id||''} onChange={event=>setEarlierId(event.target.value)}>{current.map(item=><option key={item.id} value={item.id}>{captured(item.capturedAt)}</option>)}</select></label><label>Later snapshot<select value={later?.id||''} onChange={event=>setLaterId(event.target.value)}>{current.map(item=><option key={item.id} value={item.id}>{captured(item.capturedAt)}</option>)}</select></label></div>
      {!comparable?<p className="snapshot-note">Choose two different captures in earlier-to-later order.</p>:<div className="snapshot-differences"><p>Change from {captured(earlier.capturedAt)} to {captured(later.capturedAt)}</p><dl>
        <div><dt>Stars</dt><dd>{change(earlier.stars,later.stars)}</dd></div>
        <div><dt>Forks</dt><dd>{change(earlier.forks,later.forks)}</dd></div>
        <div><dt>Open issues + PRs</dt><dd>{change(earlier.openIssues,later.openIssues)}</dd></div>
        <div><dt>Commits returned</dt><dd>{earlier.activity&&later.activity&&earlier.activity.days===later.activity.days?`${change(earlier.activity.count,later.activity.count)} · ${later.activity.days}-day sample${earlier.activity.partial||later.activity.partial?' · partial page':''}`:'Unavailable or different date ranges'}</dd></div>
        <div><dt>Attention items</dt><dd>{earlier.attention&&later.attention&&earlier.attention.days===later.attention.days&&earlier.attention.filter===later.attention.filter?`${change(earlier.attention.count,later.attention.count)} · ${later.attention.days}+ days, ${later.attention.filter}${earlier.attention.partial||later.attention.partial?' · partial page':''}`:'Unavailable or different thresholds/filters'}</dd></div>
      </dl></div>}
    </>}</div>
    <p className="snapshot-note">Attention counts mean open items with no GitHub updates for the selected threshold. They do not prove a maintainer has not responded or a pull request awaits review.</p>
  </section>;
}
