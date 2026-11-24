import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
const config={apiKey:"AIzaSyANtZF9yXTg3bvUWMFAPRwyE798av2gzl0",authDomain:"wishly-fd9ff.firebaseapp.com",projectId:"wishly-fd9ff",storageBucket:"wishly-fd9ff.firebasestorage.app",messagingSenderId:"250113116782",appId:"1:250113116782:web:c84ed484cacb2b029df47f"};
const app=getApps().length ? getApp() : initializeApp(config),auth=getAuth(app),db=getFirestore(app),$=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(s){const n=$("#notice");n.textContent=s;n.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>n.classList.add("hidden"),4500)}
let user=null,families=[];
const currentEmail=()=>String(user?.email||"").toLowerCase();
const plural=(n,word)=>n+" "+word+(n===1?"":"s");
const errorMessage=(error,action)=>error?.code==="permission-denied"?"Could not "+action+". Check that the latest Firestore rules are published.":error?.message||"Something went wrong. Try again.";
function familyCard(f){
  const members=f.memberEmails||[], pending=(f.pendingEmails||[]).filter(email=>!members.includes(email));
  const rows=emails=>emails.map(email=>'<span class="family-email">'+esc(email)+(email===currentEmail()?' <small>(you)</small>':'')+'</span>').join("");
  return '<article class="family-member-card"><div class="family-member-head"><div><h3>'+esc(f.name)+'</h3><p>'+plural((f.memberUids||[]).length,"member")+' · '+plural(pending.length,"pending invitation")+'</p></div><span class="family-role">'+(f.ownerUid===user.uid?"Owner":"Member")+'</span></div><div class="family-member-groups"><div><h4>Joined</h4>'+ (rows(members)||'<p class="family-muted">No member emails to show.</p>')+'</div><div><h4>Waiting to join</h4>'+(rows(pending)||'<p class="family-muted">No pending invitations.</p>')+'</div></div><form class="family-invite-form invite-form" data-id="'+esc(f.id)+'"><label for="invite-'+esc(f.id)+'">Invite someone</label><input id="invite-'+esc(f.id)+'" type="email" placeholder="Their Wishly account email" required><button class="small-button" type="submit">Invite</button><p class="family-muted">Ask them to sign in to Wishly and open Families to accept.</p></form></article>';
}
async function load(){
  const email=currentEmail();
  const results=await Promise.allSettled([getDocs(query(collection(db,"families"),where("memberUids","array-contains",user.uid))),email?getDocs(query(collection(db,"families"),where("pendingEmails","array-contains",email))):Promise.resolve({docs:[]})]);
  if(results[0].status==="fulfilled"){
    families=results[0].value.docs.map(d=>({id:d.id,...d.data()}));
    $("#family-list").innerHTML=families.length?families.map(familyCard).join(""):'<div class="family-empty"><h3>No families yet</h3><p>Create a family below, or accept an invitation from someone you know.</p><a class="small-button" href="#create-family-form">Create your first family</a></div>';
  }else{
    console.error(results[0].reason);$("#family-list").innerHTML='<p class="family-muted">Could not load your families. Try refreshing invitations below.</p>';
  }
  const count=$("#family-invitation-count");
  if(results[1].status==="fulfilled"){
    const pending=results[1].value.docs.filter(d=>!(d.data().memberEmails||[]).includes(email));
    count.hidden=!pending.length;count.textContent=pending.length;
    $("#pending-families").innerHTML=pending.length?pending.map(d=>'<div class="family-invitation"><div><h3>'+esc(d.data().name)+'</h3><p>You have been invited to join.</p></div><button class="small-button" data-accept="'+esc(d.id)+'" type="button">Join family</button></div>').join(""):'<p class="family-muted">No invitations for '+esc(email||"your account")+'.</p>';
  }else{console.error(results[1].reason);count.hidden=true;$("#pending-families").innerHTML='<p class="family-muted">Could not load invitations. Try refreshing.</p>';}
}
$("#family-list").addEventListener("submit",async e=>{
  const form=e.target.closest(".invite-form");if(!form)return;e.preventDefault();if(!user)return;
  const email=form.querySelector("input").value.trim().toLowerCase(), f=families.find(f=>f.id===form.dataset.id);
  if(!email||email===currentEmail())return toast("Enter another person's email address.");
  if(f?.memberEmails?.includes(email))return toast("This person has already joined your family.");
  if(f?.pendingEmails?.includes(email))return toast("This person already has an invitation.");
  const button=form.querySelector("button");button.disabled=true;
  try{await updateDoc(doc(db,"families",form.dataset.id),{pendingEmails:arrayUnion(email)});toast("Invitation created. Ask them to open Families in Wishly to accept it.");await load();}
  catch(error){toast(errorMessage(error,"invite this person"));}
  finally{button.disabled=false;}
});
$("#pending-families").addEventListener("click",async e=>{
  const button=e.target.closest("[data-accept]");if(!button||!user)return;
  button.disabled=true;
  try{await updateDoc(doc(db,"families",button.dataset.accept),{memberUids:arrayUnion(user.uid),memberEmails:arrayUnion(currentEmail()),pendingEmails:arrayRemove(currentEmail())});toast("You joined the family.");await load();}
  catch(error){toast(errorMessage(error,"join this family"));}
  finally{button.disabled=false;}
});
$("#create-family-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!user||user.isAnonymous)return toast("Sign in with a Wishly account first.");
  const name=$("#family-name").value.trim();if(!name)return;
  const button=e.currentTarget.querySelector("button");button.disabled=true;
  const id=crypto.randomUUID().replaceAll("-","").slice(0,20), email=currentEmail();
  try{await setDoc(doc(db,"families",id),{name,ownerUid:user.uid,memberUids:[user.uid],memberEmails:email?[email]:[],pendingEmails:[],createdAt:serverTimestamp()});$("#family-name").value="";toast("Family created. Invite your family from My families.");await load();document.getElementById("my-families-title")?.scrollIntoView({block:"nearest",behavior:"smooth"});}
  catch(error){toast(errorMessage(error,"create your family"));}
  finally{button.disabled=false;}
});
$("#refresh-families").addEventListener("click",async e=>{if(!user)return;const b=e.currentTarget;b.disabled=true;try{await load();}finally{b.disabled=false;}});
onAuthStateChanged(auth,async u=>{if(!u||u.isAnonymous){location.href="signup.html";return;}user=u;await load();});
