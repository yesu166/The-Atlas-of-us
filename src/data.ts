export type ChapterId="origins"|"curiosity"|"building"|"dreams"|"quiet"|"future";
export const chapters={
 origins:["CHAPTER 01","Origins","A small beginning, a lot of questions, and the habit of taking things apart just to understand them."],
 curiosity:["CHAPTER 02","Curiosity","AI, code, electronics, art, experiments — different doors into the same question: how does this work?"],
 building:["CHAPTER 03","Building","Ideas become projects here. Some ship. Some break. Both teach me something."],
 dreams:["CHAPTER 04","Dreams","Not a finished roadmap. Just a direction: keep learning, build better systems, and make room for bigger ideas."],
 quiet:["CHAPTER 05","The Quiet Place","The part of a person that is not measured in commits: people, small moments, music, art, and the things worth caring about."],
 future:["CHAPTER ???","The Missing Chapter","This chapter is intentionally unfinished. I do not know who you will be yet, and I do not want to pretend I do."]
} as const;

export const tech=[
 ["AI / ML","Models, experiments, intelligent interfaces"],
 ["Python","Turning ideas into experiments"],
 ["Software","Systems, APIs, data, interfaces"],
 ["Robotics","Making software feel physical"],
 ["Web","Interactive experiences and useful products"],
 ["Creative Tech","Making technical things feel alive"]
] as const;

export const quests=[
 "Watch a sunrise somewhere new",
 "Build something ridiculous together",
 "Try food neither of us has tried",
 "Find a favorite place",
 "Make an inside joke that makes no sense",
 "Take a terrible selfie",
 "Travel without planning every minute",
 "Create a memory worth keeping"
];

export const discoveries:Record<string,{eyebrow:string;title:string;body:string}> = {
 moon:{eyebrow:"OBJECT / MOON",title:"A quiet witness",body:"The moon has no secret backstory here. It is just a reminder that not everything needs to be productive to be worth looking at."},
 "lantern-1":{eyebrow:"OBJECT / LANTERN",title:"Light the path",body:"Some paths only become visible after you start walking. That feels true of learning too."},
 "lantern-2":{eyebrow:"OBJECT / LANTERN",title:"A little patience",body:"Most useful things I build take a few tries. The first version is usually just the beginning."},
 "lantern-3":{eyebrow:"OBJECT / LANTERN",title:"Keep going",body:"Not every experiment becomes a project. Some only leave behind a better question."},
 python:{eyebrow:"TECH / PYTHON",title:"The everyday tool",body:"Python is one of my main tools for turning ideas into experiments, data work and backend systems."},
 "ai-ml":{eyebrow:"TECH / AI & ML",title:"The direction",body:"AI and machine learning are where I spend a lot of my curiosity: models, experiments, intelligent interfaces and practical systems."},
 software:{eyebrow:"TECH / SOFTWARE",title:"Make the idea usable",body:"Software is the layer where a concept becomes something another person can actually use."},
 robotics:{eyebrow:"TECH / ROBOTICS",title:"Make it physical",body:"Robotics and electronics keep the work grounded in the real world — sensors, devices, signals and constraints."},
 web:{eyebrow:"TECH / WEB",title:"The interactive side",body:"The web is my canvas for turning technical ideas into interfaces people can explore."},
 book:{eyebrow:"OBJECT / BOOK",title:"Still becoming",body:"There is no finished version of me in this world. The book stays open because there is still plenty to learn."},
 telescope:{eyebrow:"OBJECT / TELESCOPE",title:"Look further",body:"A dream does not need to predict the future. It just gives the next experiment somewhere to aim."}
};