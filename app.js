"use strict";
const KEY="agenda-ejecutiva-lujo-v2";
let state=JSON.parse(localStorage.getItem(KEY)||'{"tasks":[],"notes":[]}');
let view="tasks",page=0,editing=false;
const $=s=>document.querySelector(s);
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const toast=msg=>{let e=$("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2100)};
function clock(){
 const d=new Date(),h=d.getHours()%12+d.getMinutes()/60,m=d.getMinutes()+d.getSeconds()/60,s=d.getSeconds();
 $("#hour").style.transform=`rotate(${h*30}deg)`;
 $("#minute").style.transform=`rotate(${m*6}deg)`;
 $("#second").style.transform=`rotate(${s*6}deg)`;
 $("#watch-date").textContent=d.getDate();
}
for(let i=0;i<12;i++){let t=document.createElement("span");t.className="tick";t.style.transform=`rotate(${i*30}deg)`;$("#marks").append(t)}
clock();setInterval(clock,1000);
function today(){return new Date().toLocaleDateString("en-CA")}
function visibleItems(){
 if(view==="notes")return state.notes.filter(n=>!n.done);
 return state.tasks.filter(n=>!n.done || n.date===today());
}
function render(){
 const all=visibleItems(),size=6,count=Math.max(1,Math.ceil(all.length/size));page=Math.min(Math.max(page,0),count-1);
 $("#paper-title").textContent=view==="notes"?"Mis Notas Rápidas":"Mis Pendientes de Hoy";
 const box=$("#page-content");box.replaceChildren();
 for(const item of all.slice(page*size,(page+1)*size)){
  const line=document.createElement("label");line.className="task"+(item.done?" done":"");
  const check=document.createElement("input");check.type="checkbox";check.checked=!!item.done;
  check.onchange=()=>{item.done=check.checked;save();render();if(visibleItems().length===0)toast("JORNADA CUMPLIDA")};
  const span=document.createElement("span");span.className="task-text";span.textContent=item.text;
  line.append(check,span);
  if(item.remind){const small=document.createElement("small");small.textContent=new Date(item.remind).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"});line.append(small)}
  box.append(line);
 }
 if(!all.length){const p=document.createElement("p");p.style.cssText="text-align:center;font-style:italic;margin-top:12%;color:#755b38";p.textContent=view==="notes"?"No tienes notas pendientes.":"Tu hoja está lista para nuevos pendientes.";box.append(p)}
 $("#page-counter").textContent=`‹     Hoja ${page+1} de ${count}     ›`;
}
let touchStart=0;
$("#paper").addEventListener("touchstart",e=>touchStart=e.changedTouches[0].clientX,{passive:true});
$("#paper").addEventListener("touchend",e=>{const delta=e.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>45){page+=delta<0?1:-1;render()}},{passive:true});
$("#page-counter").onclick=e=>{page+=e.offsetX>e.currentTarget.clientWidth/2?1:-1;render()};
function startEdit(){editing=true;$("#editor").hidden=false;$("#note-text").value="";$("#note-date").value="";$("#note-text").focus()}
function finishEdit(){
 if(!editing)return;
 const text=$("#note-text").value.trim(),remind=$("#note-date").value;
 if(text){const item={id:crypto.randomUUID(),text,done:false,created:new Date().toISOString(),remind};(view==="notes"?state.notes:state.tasks).push(item);save();toast("Nota guardada")}
 editing=false;$("#editor").hidden=true;render()
}
$("#pen").onclick=()=>editing?finishEdit():startEdit();

$("#cancel-note").onclick=()=>{$("#editor").hidden=true;editing=false};
$("#notes").onclick=()=>{view="notes";page=0;render()};
$("#add-task").onclick=()=>{view="tasks";startEdit()};
$("#export").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="respaldo-agenda.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("#paper-title").onclick=()=>{view="tasks";page=0;render()};
if("Notification" in window)$("#toolbar").addEventListener("dblclick",()=>Notification.requestPermission());
setInterval(()=>{
 const now=Date.now();
 for(const item of [...state.tasks,...state.notes]){
  if(item.remind&&!item.done&&!item.alerted&&new Date(item.remind).getTime()<=now){
   item.alerted=true;save();
   if("Notification" in window&&Notification.permission==="granted")new Notification("Agenda Ejecutiva",{body:item.text});
   toast("Recordatorio: "+item.text);
  }
 }
},15000);
render();
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
