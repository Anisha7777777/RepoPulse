export interface ActivitySummary {count:number;days:number;partial:boolean}
export interface AttentionSummary {count:number;days:number;filter:'all'|'issue'|'pull request';partial:boolean}
export interface RepositorySnapshot {
  id:string;
  repository:string;
  capturedAt:string;
  stars:number|null;
  forks:number|null;
  openIssues:number|null;
  activity:ActivitySummary|null;
  attention:AttentionSummary|null;
}
