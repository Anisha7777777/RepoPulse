import type {AttentionItem,Commit,Repository} from '../types/github';
export async function fetchRepositoryDetails(name:string,signal:AbortSignal):Promise<Repository>{
 const path='/repos/'+name.split('/').map(encodeURIComponent).join('/');
 const {data}=await request<Repository>(path,signal);
 return data;
}
export async function fetchCommitActivity(name:string,days:number,signal:AbortSignal):Promise<{commits:Commit[];hasMore:boolean}>{
 const path='/repos/'+name.split('/').map(encodeURIComponent).join('/');
 const since=new Date();
 since.setUTCHours(0,0,0,0);
 since.setUTCDate(since.getUTCDate()-(days-1));
 const {data,hasNext}=await request<Commit[]>(`${path}/commits?per_page=100&since=${encodeURIComponent(since.toISOString())}`,signal,true);
 return {commits:data,hasMore:hasNext};
}
export async function fetchAttentionItems(name:string,signal:AbortSignal):Promise<{items:AttentionItem[];hasMore:boolean}>{
 const path='/repos/'+name.split('/').map(encodeURIComponent).join('/');
 const {data,hasNext}=await request<AttentionItem[]>(`${path}/issues?state=open&sort=updated&direction=asc&per_page=100`,signal);
 return {items:data,hasMore:hasNext};
}
async function request<T>(path:string,signal:AbortSignal,emptyOnConflict=false):Promise<{data:T;hasNext:boolean}>{
 let response:Response;try{response=await fetch(`https://api.github.com${path}`,{signal,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});}catch(error){if(signal.aborted)throw error;throw new Error('Unable to reach GitHub. Check your connection and retry.');}
 if(!response.ok){if(response.status===404)throw new Error('Repository not found. It may be private, inaccessible, renamed, or misspelled.');if(response.status===403||response.status===429){const reset=response.headers.get('x-ratelimit-reset');throw new Error(`GitHub has limited this request.${reset?` Try after ${new Date(Number(reset)*1000).toLocaleTimeString()}.`:' Please try again later.'} Unauthenticated requests share a limited quota.`);}if(response.status===409&&emptyOnConflict)return {data:[] as T,hasNext:false};throw new Error(`GitHub returned ${response.status}. Please retry.`);}
 let data:T;try{data=await response.json() as T;}catch{throw new Error('GitHub returned data that could not be read. Please retry.');}
 return {data,hasNext:response.headers.get('link')?.includes('rel="next"')??false};
}
