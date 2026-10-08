const KEY="awwu:save:v1";
export type SaveData={hearts:string[];chapters:string[];quests:string[];sound:boolean;reduced:boolean};
const defaults:SaveData={hearts:[],chapters:["origins"],quests:[],sound:false,reduced:false};
export const loadSave=():SaveData=>{try{const x=localStorage.getItem(KEY);return x?{...defaults,...JSON.parse(x)}:defaults}catch{return defaults}};
export const saveProgress=(x:SaveData)=>{try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}};
export const resetProgress=()=>{try{localStorage.removeItem(KEY)}catch{}};