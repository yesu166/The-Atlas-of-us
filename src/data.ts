export type RegionId="garden"|"workshop"|"city"|"lake"|"mountain"|"house";
export type FragmentId="star"|"spark"|"gear"|"idea"|"memory"|"dream"|"courage"|"possibility"|"quiet"|"tomorrow"|"home"|"unknown";

export type AtlasFragment={
  id:FragmentId;
  title:string;
  icon:string;
  region:RegionId|"final";
  description:string;
};

export const regions:Record<RegionId,{index:number;name:string;short:string;subtitle:string;accent:string;position:number}>={
  garden:{index:1,name:"The Origin Garden",short:"ORIGIN",subtitle:"Questions before answers.",accent:"#df9fbd",position:4},
  workshop:{index:2,name:"The Workshop of Broken Things",short:"WORKSHOP",subtitle:"Make. Break. Understand.",accent:"#7ed8dc",position:-18},
  city:{index:3,name:"The City of Possibility",short:"CITY",subtitle:"Three directions. One horizon.",accent:"#9b8ff4",position:-42},
  lake:{index:4,name:"The Quiet Lake",short:"LAKE",subtitle:"Nothing here needs to be rushed.",accent:"#78c5df",position:-66},
  mountain:{index:5,name:"The Mountain of Tomorrow",short:"MOUNTAIN",subtitle:"A longer view.",accent:"#f0c69c",position:-90},
  house:{index:6,name:"The Unwritten House",short:"HOUSE",subtitle:"A life with one room still empty.",accent:"#eaaac6",position:-116}
};

export const atlasFragments:AtlasFragment[]=[
  {id:"star",title:"STAR",icon:"✦",region:"garden",description:"The first light. Proof that curiosity can become a direction."},
  {id:"spark",title:"SPARK",icon:"✧",region:"workshop",description:"The moment an idea stops being only an idea."},
  {id:"gear",title:"GEAR",icon:"◌",region:"workshop",description:"Systems work because small pieces keep moving together."},
  {id:"idea",title:"IDEA",icon:"◇",region:"city",description:"A possibility becomes real when you give it a shape."},
  {id:"memory",title:"MEMORY",icon:"▣",region:"workshop",description:"Broken things can teach you more than perfect things."},
  {id:"dream",title:"DREAM",icon:"☾",region:"city",description:"A direction is useful even before it becomes a plan."},
  {id:"courage",title:"COURAGE",icon:"△",region:"mountain",description:"Keep moving when the path stops being obvious."},
  {id:"possibility",title:"POSSIBILITY",icon:"∞",region:"city",description:"Three doors can all be worth opening."},
  {id:"quiet",title:"QUIET",icon:"≈",region:"lake",description:"Some moments matter precisely because nothing is happening."},
  {id:"tomorrow",title:"TOMORROW",icon:"↑",region:"mountain",description:"The future is a direction, not a prediction."},
  {id:"home",title:"HOME",icon:"⌂",region:"house",description:"A place can be ready without a story being decided for it."},
  {id:"unknown",title:"UNKNOWN",icon:"?",region:"final",description:"The final page stays blank on purpose."}
];

export type QuestId="garden"|"workshop"|"city"|"lake"|"mountain"|"house"|"ending";

export const quests=[
  {id:"garden" as QuestId,title:"Find the first light",region:"garden" as RegionId,description:"Investigate the lantern trail and wake the suspended star.",objective:"Activate all three lanterns."},
  {id:"workshop" as QuestId,title:"Restore the Memory Engine",region:"workshop" as RegionId,description:"A broken machine is waiting for three missing systems.",objective:"Recover the core, gear and signal."},
  {id:"city" as QuestId,title:"Walk three directions",region:"city" as RegionId,description:"The City of Possibility has three doors. There is no wrong one.",objective:"Visit CREATE, LEARN and EXPLORE."},
  {id:"lake" as QuestId,title:"Decode the reflection",region:"lake" as RegionId,description:"The constellation above the water has a pattern below it too.",objective:"Recreate the reflected constellation."},
  {id:"mountain" as QuestId,title:"Reach the observatory",region:"mountain" as RegionId,description:"The trail gets steeper, but the view gets bigger.",objective:"Collect three future signals."},
  {id:"house" as QuestId,title:"Assemble the missing page",region:"house" as RegionId,description:"Three Atlas fragments can open the only door in the empty room.",objective:"Place three key fragments at the final door."},
  {id:"ending" as QuestId,title:"Leave one page unwritten",region:"house" as RegionId,description:"The Atlas is complete enough to begin — not enough to predict.",objective:"Enter the final sky."}
] as const;

export const chapterCopy={
  garden:["CHAPTER 01","The Origin Garden","You started with questions before you had answers."],
  workshop:["CHAPTER 02","The Workshop of Broken Things","The first useful thing here was learning why the first version failed."],
  city:["CHAPTER 03","The City of Possibility","Three directions can be explored without choosing a single future."],
  lake:["CHAPTER 04","The Quiet Lake","Some things are worth experiencing even when nobody is watching."],
  mountain:["CHAPTER 05","The Mountain of Tomorrow","A dream gets more interesting when the next step requires effort."],
  house:["CHAPTER 06","The Unwritten House","Everything is ready. One room is still deliberately empty."]
} as const;
