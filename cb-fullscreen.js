/* Coffeebreak fullscreen helper */
(function(){
if(window.__cbfs)return;window.__cbfs=1;
var d=document;
function meta(){if(!d.querySelector('meta[name=viewport]')){var m=d.createElement('meta');m.name='viewport';m.content='width=device-width,initial-scale=1,viewport-fit=cover';(d.head||d.documentElement).appendChild(m);}}
meta();
var st=d.createElement('style');
st.textContent='html,body{min-height:100%;margin:0}body{min-height:100vh;min-height:100dvh}canvas{touch-action:none}#cbfs-btn{position:fixed;right:10px;bottom:10px;z-index:2147483647;width:42px;height:42px;border-radius:50%;border:2px solid #fff;background:rgba(60,20,40,.75);color:#fff;font:20px/38px sans-serif;text-align:center;cursor:pointer;padding:0;opacity:.8}#cbfs-btn:hover{opacity:1}:fullscreen body{overflow:auto}';
(d.head||d.documentElement).appendChild(st);
function mainCanvas(){var best=null,a=0;d.querySelectorAll('canvas').forEach(function(c){if(c.id==='cbfs-x')return;var r=c.getBoundingClientRect(),s=r.width*r.height;if(s>a){a=s;best=c}});return a>=40000?best:null}
var z=1;
function fit(){
 var de=d.documentElement,b=d.body;if(!b)return;
 de.style.zoom='';z=1;
 var vw=window.innerWidth,vh=window.innerHeight,c=mainCanvas();
 var cw=Math.max(b.scrollWidth,de.scrollWidth),ch=Math.max(b.scrollHeight,de.scrollHeight);
 var k=1;
 if(c){var r=c.getBoundingClientRect();
  // fixed small game area on a non-scrolling page: zoom so the game fills the screen, keeping aspect ratio
  if(r.width<vw*0.9&&r.height<vh*0.9&&ch<=vh*1.15&&cw<=vw*1.15){k=Math.min(vw/cw,vh/ch);}
  else if(cw>vw+4){k=vw/cw;}
 } else if(cw>vw+4){k=vw/cw;}
 k=Math.max(0.3,Math.min(k,3));
 if(Math.abs(k-1)>0.04){z=k;de.style.zoom=k;}
}
var t;function sched(){clearTimeout(t);t=setTimeout(fit,120)}
window.addEventListener('resize',sched);window.addEventListener('orientationchange',sched);
d.addEventListener('fullscreenchange',sched);d.addEventListener('webkitfullscreenchange',sched);
function fsEl(){return d.fullscreenElement||d.webkitFullscreenElement}
function toggle(){var e=d.documentElement;
 if(fsEl()){(d.exitFullscreen||d.webkitExitFullscreen||function(){}).call(d)}
 else{var f=e.requestFullscreen||e.webkitRequestFullscreen||e.webkitEnterFullscreen;if(f){try{var p=f.call(e);if(p&&p.catch)p.catch(function(){})}catch(_){}}}}
function btn(){if(d.getElementById('cbfs-btn'))return;var b=d.createElement('button');b.id='cbfs-btn';b.type='button';b.title='Fullscreen';b.setAttribute('aria-label','Fullscreen');b.textContent='\u26F6';
 b.addEventListener('click',function(e){e.stopPropagation();toggle()});d.body.appendChild(b);}
function init(){btn();fit();setTimeout(fit,600);setTimeout(fit,2000)}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
window.cbFullscreen={toggle:toggle,fit:fit};
})();
