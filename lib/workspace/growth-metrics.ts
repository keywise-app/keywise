type Outcome={workflow_id:string;user_id:string;workflow:string;event:string;occurred_at:string};
export function workflowMetrics(rows:Outcome[]) {
  const groups=new Map<string,Outcome[]>();
  for(const row of rows){const key=`${row.user_id}:${row.workflow}:${row.workflow_id}`;groups.set(key,[...(groups.get(key)||[]),row]);}
  return ['occupied_import','rent_payment','repair','renewal'].map(workflow=>{
    const started=new Set<string>(),completed=new Set<string>(),owners=new Set<string>(),seconds:number[]=[];
    for(const [key,events] of groups){
      if(events[0].workflow!==workflow)continue;
      const start=events.find(e=>e.event==='started'),finish=events.find(e=>e.event==='completed');
      if(start)started.add(key);
      if(finish){completed.add(key);owners.add(finish.user_id);}
      if(start&&finish){const elapsed=(Date.parse(finish.occurred_at)-Date.parse(start.occurred_at))/1000;if(Number.isFinite(elapsed)&&elapsed>=0)seconds.push(elapsed);}
    }
    seconds.sort((a,b)=>a-b);const middle=Math.floor(seconds.length/2);
    return {workflow,started:started.size,completed:completed.size,completed_owners:owners.size,paired_completions:seconds.length,median_elapsed_seconds:seconds.length?(seconds.length%2?seconds[middle]:(seconds[middle-1]+seconds[middle])/2):null};
  });
}
