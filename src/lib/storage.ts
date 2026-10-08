const KEY="atlas-of-us:save:v1";

export type SaveData={
  fragments:string[];
  completedQuests:string[];
  flags:Record<string,number|string|boolean>;
  visitedRegions:string[];
  sound:boolean;
  reduced:boolean;
};

const defaults:SaveData={
  fragments:[],
  completedQuests:[],
  flags:{},
  visitedRegions:["garden"],
  sound:false,
  reduced:false
};

export const loadSave=():SaveData=>{
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return {...defaults};
    const parsed=JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      fragments:Array.isArray(parsed.fragments)?parsed.fragments:[],
      completedQuests:Array.isArray(parsed.completedQuests)?parsed.completedQuests:[],
      flags:parsed.flags&&typeof parsed.flags==="object"?parsed.flags:{},
      visitedRegions:Array.isArray(parsed.visitedRegions)?parsed.visitedRegions:["garden"]
    };
  }catch{return {...defaults}};
};

export const saveProgress=(value:SaveData)=>{
  try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}
};

export const resetProgress=()=>{
  try{localStorage.removeItem(KEY);}catch{}
};
