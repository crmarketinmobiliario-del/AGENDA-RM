"use strict";
const KEY="agenda-ejecutiva-lujo-v2";
let state;
try {state=JSON.parse(localStorage.getItem(KEY)||'{"tasks":[],"notes":[]}');} catch {state={tasks:[],notes:[]};}
state.tasks ||= []; state.notes ||= [];
let view="tasks", page=0, editing=false, editMode="notes", touchStart=null;
const $=s=>document.querySelector(s);
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
let toastTimer;
function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),3000)}
function clock(){const d=new Date(),h=d.getHours()%12+d.getMinutes()/60,m=d.getMinutes()+d.getSeconds()/60,s=d.getSeconds();$("#hour").style.transform=`rotate(${h*30}deg)`;$("#minute").style.transform=`rotate(${m*6}deg)`;$("#second").style.transform=`rotate(${s*6}deg)`;$("#watch-date").textContent=d.getDate()}
for(let i=0;i<12;i++){let t=document.createElement("span");t.className="tick";t.style.transform=`rotate(${i*30}deg)`;$("#marks").append(t)}clock();setInterval(clock,1000);
const PAGE_SIZE=5;
function activeItems(){return (view==="notes"?state.notes:state.tasks).filter(n=>!n.done)}
function totalPages(){return Math.max(1,Math.ceil(activeItems().length/PAGE_SIZE)+1)} // Siempre existe una hoja limpia final.
function render(){
 const all=activeItems(),count=totalPages();page=Math.max(0,Math.min(page,count-1));
 const blank=page===count-1;
 $("#paper-title").textContent=blank?"Hoja en blanco":view==="notes"?"Mis Notas Rápidas":"Mis Pendientes de Hoy";
 const box=$("#page-content");box.replaceChildren();
 if(blank){const p=document.createElement("p");p.className="blank-instruction";p.textContent="Toca la pluma para escribir aquí.";box.append(p)}
 else for(const item of all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){
  const line=document.createElement("label");line.className="task";
  const check=document.createElement("input");check.type="checkbox";check.checked=false;
  check.addEventListener("change",()=>{item.done=true;item.doneAt=new Date().toISOString();save();render();toast(activeItems().length?"Pendiente atendido":"JORNADA CUMPLIDA")});
  const span=document.createElement("span");span.className="task-text";span.textContent=item.text;
  line.append(check,span);
  if(item.remind){const small=document.createElement("small");small.textContent=new Date(item.remind).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"});line.append(small)}
  box.append(line);
 }
 $("#page-counter").textContent=`‹   Hoja ${page+1} de ${count}   ›`;
 $("#paper").classList.toggle("blank-page",blank);
}
function movePage(direction){if(editing)return;const next=Math.max(0,Math.min(page+direction,totalPages()-1));if(next!==page){page=next;$("#paper").classList.remove("turning");void $("#paper").offsetWidth;$("#paper").classList.add("turning");render()}else toast(direction>0?"Última hoja: lista para escribir":"Primera hoja")}
const paper=$("#paper");
paper.addEventListener("touchstart",e=>{if(e.target.closest("input"))return;touchStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}},{passive:true});
paper.addEventListener("touchend",e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.15)movePage(dx<0?1:-1)},{passive:true});
// También funciona con ratón en PC.
let mouseX=null;paper.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&!e.target.closest("input"))mouseX=e.clientX});paper.addEventListener("pointerup",e=>{if(mouseX!==null){const d=e.clientX-mouseX;mouseX=null;if(Math.abs(d)>40)movePage(d<0?1:-1)}});
$("#page-counter").addEventListener("click",e=>movePage(e.offsetX>e.currentTarget.clientWidth/2?1:-1));
function startEdit(){
 if(page!==totalPages()-1){page=totalPages()-1;render();toast("Hoja limpia: toca otra vez la pluma para escribir");return}
 editing=true;editMode=view==="notes"?"notes":"tasks";$("#editor").hidden=false;$("#note-text").value="";$("#note-date").value="";$("#note-text").focus();
}
function finishEdit(){
 if(!editing)return;
 const text=$("#note-text").value.trim(),remind=$("#note-date").value;
 if(text){const item={id:crypto.randomUUID(),text,done:false,created:new Date().toISOString(),remind,alerted:false};state[editMode].push(item);save();toast("Guardado en tus hojas pendientes");page=totalPages()-2}
 else toast("Hoja vacía; no se guardó nada");
 editing=false;$("#editor").hidden=true;render();
}
// La pluma siempre permanece encima de la hoja de edición.
$("#pen").addEventListener("click",()=>editing?finishEdit():startEdit());
$("#cancel-note").addEventListener("click",()=>{$("#editor").hidden=true;editing=false});
$("#notes").addEventListener("click",()=>{view="notes";page=0;render()});
$("#add-task").addEventListener("click",()=>{view="tasks";page=totalPages()-1;render();toast("Hoja limpia: toca la pluma para escribir")});
$("#paper-title").addEventListener("click",()=>{if(!editing){view="tasks";page=0;render()}});
$("#export").addEventListener("click",()=>{const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.href=url;a.download="respaldo-agenda.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)});
let registrationPromise=null;
if("serviceWorker" in navigator && location.protocol.startsWith("http"))registrationPromise=navigator.serviceWorker.register("./service-worker.js").catch(()=>null);
async function showNotice(title,body,tag){
 if(!("Notification" in window)||Notification.permission!=="granted")return false;
 try{const reg=registrationPromise?await registrationPromise:null;if(reg){await reg.showNotification(title,{body,icon:"./icon-192.png",badge:"./icon-192.png",tag,renotify:true,data:{url:"./index.html"}});return true}}
 catch(e){console.warn("Notificación SW:",e)}
 try{new Notification(title,{body,icon:"./icon-192.png",tag});return true}catch{return false}
}
$("#notify").addEventListener("click",async()=>{
 if(!("Notification" in window)){toast("Este navegador no admite notificaciones");return}
 if(!window.isSecureContext){toast("Publica la agenda con HTTPS para activar avisos");return}
 const permission=Notification.permission==="default"?await Notification.requestPermission():Notification.permission;
 if(permission!=="granted"){toast("Activa notificaciones en los ajustes del navegador");return}
 const ok=await showNotice("Agenda Ejecutiva","Avisos activados en este dispositivo.","agenda-activacion-"+Date.now());
 toast(ok?"Notificación enviada: revisa tu celular":"No se pudo mostrar el aviso");
});
async function checkReminders(){
 const now=Date.now();let dirty=false;
 for(const item of [...state.tasks,...state.notes]){
  if(item.remind&&!item.done&&!item.alerted&&new Date(item.remind).getTime()<=now){
   item.alerted=true;dirty=true;
   await showNotice("Agenda Ejecutiva · Recordatorio",item.text,"agenda-recordatorio-"+item.id);
   toast("Recordatorio: "+item.text);
  }
 }
 if(dirty)save();
}
setInterval(checkReminders,15000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkReminders()});
render();checkReminders();
