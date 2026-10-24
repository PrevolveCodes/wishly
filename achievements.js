import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANtZF9yXTg3bvUWMFAPRwyE798av2gzl0",
  authDomain: "wishly-fd9ff.firebaseapp.com",
  projectId: "wishly-fd9ff",
  storageBucket: "wishly-fd9ff.firebasestorage.app",
  messagingSenderId: "250113116782",
  appId: "1:250113116782:web:c84ed484cacb2b029df47f",
  measurementId: "G-EG1Z8P6MZW"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const milestones = [
  {id:"first-list",icon:"📝",title:"First Wish",description:"Create your very first wishlist.",test:s=>s.lists>=1,progress:s=>Math.min(s.lists,1),goal:1},
  {id:"list-builder",icon:"📚",title:"List Builder",description:"Create five wishlists for different occasions.",test:s=>s.lists>=5,progress:s=>Math.min(s.lists,5),goal:5},
  {id:"wish-starter",icon:"🎁",title:"Wish Starter",description:"Add your first item to a wishlist.",test:s=>s.items>=1,progress:s=>Math.min(s.items,1),goal:1},
  {id:"wish-collector",icon:"💜",title:"Wish Collector",description:"Add ten items across your wishlists.",test:s=>s.items>=10,progress:s=>Math.min(s.items,10),goal:10},
  {id:"wish-master",icon:"🌟",title:"Wish Master",description:"Collect twenty-five wishlist items.",test:s=>s.items>=25,progress:s=>Math.min(s.items,25),goal:25},
  {id:"big-dreams",icon:"🚀",title:"Big Dreams",description:"Reach fifty wishlist items.",test:s=>s.items>=50,progress:s=>Math.min(s.items,50),goal:50},
  {id:"planner",icon:"📅",title:"Planner",description:"Add event dates to three wishlists.",test:s=>s.datedLists>=3,progress:s=>Math.min(s.datedLists,3),goal:3},
  {id:"variety",icon:"🎨",title:"A Little of Everything",description:"Use five different item categories.",test:s=>s.categories>=5,progress:s=>Math.min(s.categories,5),goal:5}
];

async function loadAchievements(user) {
  const grid=$("#achievement-grid");
  try {
    const snap=await getDocs(query(collection(db,"wishlists"),where("ownerUid","==",user.uid)));
    const lists=snap.docs.map(d=>({code:d.id,...d.data()}));
    const state={lists:lists.filter(list=>!list.archived).length,items:0,datedLists:lists.filter(list=>!list.archived&&list.eventDate).length,categories:new Set()};
    for(const list of lists) {
      if(list.archived) continue;
      try {
        const items=await getDocs(collection(db,"wishlists",list.code,"items"));
        state.items+=items.size;
        items.forEach(itemDoc=>state.categories.add(String(itemDoc.data().category||"Other").trim().toLowerCase()));
      } catch {}
    }
    state.categories=state.categories.size;
    const unlocked=milestones.filter(item=>item.test(state)).length;
    $("#achievement-count").textContent=unlocked+" / "+milestones.length;
    $("#achievement-progress-bar").style.width=(unlocked/milestones.length*100)+"%";
    grid.innerHTML=milestones.map(item=>{
      const done=item.test(state);
      const progress=item.progress(state);
      return `<article class="achievement-card ${done?"is-unlocked":"is-locked"}">
        <div class="achievement-icon" aria-hidden="true">${item.icon}</div>
        <div class="achievement-copy"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p>
        <span class="achievement-status">${done?"✓ Unlocked":"🔒 "+progress+" / "+item.goal+" progress"}</span></div>
      </article>`;
    }).join("");
    $("#achievement-message").textContent=unlocked===milestones.length?"You've unlocked every achievement so far. More may be added later.":"Keep making lists and adding ideas to unlock more achievements.";
  } catch(error) {
    grid.innerHTML='<div class="achievement-empty"><strong>Could not load achievements.</strong><p>Check your connection and Firestore rules, then refresh.</p></div>';
    $("#achievement-count").textContent="—";
    console.error("Wishly achievements failed to load",error);
  }
}
onAuthStateChanged(auth,user=>{
  if(!user||user.isAnonymous){window.location.replace("signup.html");return;}
  loadAchievements(user);
});