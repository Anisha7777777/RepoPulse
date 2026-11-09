import { useCallback, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, BookOpen, CircleDot, Code2, GitFork, Github, Layers3, Search, Sparkles, Star } from 'lucide-react';
import { sampleRepository } from './sampleRepository';
import { fetchRepositoryDetails } from './services/github';
import type { Repository } from './types/github';
import Activity from './components/Activity';
import Attention from './components/Attention';
import Snapshots from './components/Snapshots';
import type { ActivitySummary, AttentionSummary } from './types/snapshot';

function App() {
  const [repository, setRepository] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Repository | 'sample' | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapshotRepository, setSnapshotRepository] = useState('');
  const [activitySummary, setActivitySummary] = useState<ActivitySummary|null>(null);
  const [attentionSummary, setAttentionSummary] = useState<AttentionSummary|null>(null);
  const requestController = useRef<AbortController | null>(null);
  const onActivitySummary = useCallback((summary:ActivitySummary|null)=>setActivitySummary(summary),[]);
  const onAttentionSummary = useCallback((summary:AttentionSummary|null)=>setAttentionSummary(summary),[]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await searchRepository(repository);
  }

  async function searchRepository(input:string) {
    requestController.current?.abort();
    setLoading(false);
    const value = input.trim();
    if (!value) {
      setError('Enter a repository as owner/repository to continue.');
      setResult(null);
      return;
    }
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[a-z\d._-]+$/i.test(value)) {
      setError('That format doesn’t look right. Try something like facebook/react.');
      setResult(null);
      return;
    }
    setError('');
    setResult(null);
    setSnapshotRepository(value);
    setActivitySummary(null);
    setAttentionSummary(null);
    setLoading(true);
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const details = await fetchRepositoryDetails(value, controller.signal);
      if (!controller.signal.aborted) {setResult(details);setSnapshotRepository(details.full_name);}
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Something went wrong. Please retry.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function showSample(name:string) {
    requestController.current?.abort();
    setRepository(name);
    setError('');
    setLoading(false);
    setResult('sample');
    setActivitySummary(null);
    setAttentionSummary(null);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="RepoPulse home"><span className="brand-mark"><Sparkles size={18}/></span><span>repo<span className="brand-light">pulse</span></span></a>
      <div className="side-label">WORKSPACE</div>
      <a className="nav-link active" href="#dashboard"><Layers3 size={17}/> Overview</a>
      <div className="sidebar-bottom"><div className="side-label">YOUR TOOLKIT</div><div className="tool-note"><BookOpen size={16}/><span>Clarity for every codebase.</span></div><div className="sidebar-foot">A little more context<br/>for your next great idea.</div></div>
    </aside>
    <main id="top" className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><a className="github-link" href="https://github.com" target="_blank" rel="noreferrer"><Github size={16}/> GitHub <ArrowUpRight size={13}/></a></header>
      <div className="content" id="dashboard">
        <div className="eyebrow"><span className="live-dot"/> REPOSITORY INTELLIGENCE <span className="eyebrow-rule"/></div>
        <section className="hero"><div><div className="hero-kicker">A clearer view of open source</div><h1>Your repository.<br/><span>Understood.</span></h1><p>Explore a codebase at a glance. Start with any public repository.</p></div><div className="hero-decoration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-center"><Code2 size={28}/></div><span className="orbit-chip chip-a">&lt;/&gt;</span><span className="orbit-chip chip-b">{ }</span></div></section>
        <section className="search-panel" aria-labelledby="search-title"><div className="search-title-row"><div><div className="section-kicker">01 / GET STARTED</div><h2 id="search-title">Find a repository</h2></div><span className="input-hint">PUBLIC REPOSITORIES</span></div>
          <form onSubmit={handleSubmit} noValidate><label className="sr-only" htmlFor="repository-input">Repository in owner/repository format</label><div className={`input-wrap ${error?'has-error':''}`}><Github size={20}/><input id="repository-input" value={repository} onChange={e=>{setRepository(e.target.value);if(error)setError('');}} placeholder="owner/repository  ·  e.g. facebook/react" autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error?'search-error':'search-help'}/><button type="submit"><Search size={16}/> {loading?'Loading…':'Explore'} <span aria-hidden="true">↗</span></button></div><p id="search-help" className="sr-only">Enter a public GitHub repository as owner/repository, without a URL.</p>{error&&<p id="search-error" className="error-message" role="alert">{error}</p>}</form>
          <div className="quick-row"><span>TRY A REPOSITORY</span><button onClick={()=>showSample('facebook/react')}>Sample: facebook/react <ArrowUpRight size={12}/></button><button onClick={()=>{setRepository('vercel/next.js');void searchRepository('vercel/next.js');}}>Live: vercel/next.js <ArrowUpRight size={12}/></button><span className="sample-disclaimer">Sample preview or live GitHub details</span></div>
        </section>
        {loading ? <section className="empty-state" role="status"><div className="empty-icon"><Search size={19}/></div><div><h3>Loading repository…</h3><p>Fetching public details from GitHub.</p></div></section> : result ? <Overview repository={result==='sample'?null:result}/> : <section className="empty-state"><div className="empty-icon"><Search size={19}/></div><div><h3>{error?'No repository to display yet.':'Your next insight starts here.'}</h3><p>{error?'Check the message above and try another repository.':'Enter an owner and repository above to see live details, or choose a sample preview.'}</p></div><span className="empty-arrow">↗</span></section>}
        {!loading && result && result!=='sample' && <Activity key={result.full_name} repository={result} onSummary={onActivitySummary}/>}
        {!loading && result && result!=='sample' && <Attention key={result.full_name} repository={result} onSummary={onAttentionSummary}/>}
        {snapshotRepository && <Snapshots repositoryName={snapshotRepository} liveRepository={result&&result!=='sample'&&result.full_name===snapshotRepository?result:null} activity={activitySummary} attention={attentionSummary}/>}
        <footer><span>REPOPULSE <span className="footer-sep">/</span> BUILT FOR CURIOUS MINDS</span><span>Repository details · GitHub public API</span></footer>
      </div>
    </main>
  </div>;
}

function Overview({repository}: {repository:Repository | null}) {
  const sample = repository === null;
  const repo = sample ? sampleRepository : repository;
  const numberLabel=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString():'Unavailable';
  const metrics = [{label:'STARS',value:sample?sampleRepository.stars:numberLabel(repository.stargazers_count),icon:Star},{label:'FORKS',value:sample?sampleRepository.forks:numberLabel(repository.forks_count),icon:GitFork},{label:sample?'OPEN ISSUES':'OPEN ISSUES + PRS',value:sample?sampleRepository.openIssues:numberLabel(repository.open_issues_count),icon:CircleDot}];
  const url = sample ? `https://github.com/${repo.owner}/${repo.name}` : repository.html_url;
  const owner = sample ? sampleRepository.owner : repository.owner.login;
  const pushed = sample ? sampleRepository.updated : (repository.pushed_at && Number.isFinite(Date.parse(repository.pushed_at)) ? new Date(repository.pushed_at).toLocaleDateString() : 'Unavailable');
  return <section className="overview-card" aria-label={`${sample?'Sample':'Live'} repository overview`}><div className="overview-top"><div className="repo-identity"><div className="repo-avatar">{!sample&&repository.owner.avatar_url?<img src={repository.owner.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Code2 size={24}/>}</div><div><div className="section-kicker">02 / REPOSITORY OVERVIEW <span className="demo-tag">{sample?'SAMPLE DATA':'LIVE GITHUB DATA'}</span></div><h2>{owner}<span className="repo-slash"> / </span><strong>{repo.name}</strong></h2><p>{repo.description || 'No description provided.'}</p></div></div><a href={url} target="_blank" rel="noreferrer" aria-label="Open repository on GitHub" className="external-link"><ArrowUpRight size={18}/></a></div>
    <div className="metrics-grid">{metrics.map(({label,value,icon:Icon})=><div className="metric" key={label}><div className="metric-label"><Icon size={14}/>{label}</div><div className="metric-value">{value}</div><div className="metric-caption">{sample?'Sample figure':'GitHub count'}</div></div>)}<div className="metric"><div className="metric-label"><Code2 size={14}/>PRIMARY LANGUAGE</div><div className="metric-value language-value"><span className="language-dot"/>{repo.language || 'Not specified'}</div><div className="metric-caption">{sample?'Sample classification':'GitHub primary language'}</div></div></div>
    <div className="overview-foot"><span><span className="sample-pip"/> {sample?'Every figure above is illustrative sample content.':'Details returned by GitHub for this public repository.'}</span><span>Last push · {pushed}</span></div>
  </section>;
}

export default App;
