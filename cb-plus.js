/* Coffeebreak Plus v3: bigger text, calm mode, read aloud, how to play, share, full screen,
   report, logo on downloads, autosave of notes, undo/redo helpers, house rules. Free, no tracking. */
(function(){
if(window.__cbplus)return;window.__cbplus=1;
var D=document,s=D.currentScript||{},cfg=(s.dataset||{});
var APP=cfg.app||(D.title||'Coffeebreak').replace(/\s*[|–-].*$/,'')||'Coffeebreak';
var URL0=cfg.url||'https://coffeebreaks.itch.io';
var LOGO=cfg.logo||'cb-plus-logo.png';
var KIND=cfg.kind||'product';
var KIDS=cfg.kids=='1';
var HOW=cfg.howto||'';
var DRAW=cfg.draw=='1';
var PAYID='Pay by PayID (Teachers Mutual Bank): darkokaz@gmx.com';
var DISC="\u00a9 Karen O'Brien (Coffeebreak). Karen O'Brien keeps all rights to this "+KIND+", its designs, name and logo. Buyers may resell the physical item they bought but may not copy it or make their own version. Third-party brands named belong to their owners."+(KIDS?" This kids game has sound effects only, no music, and the sound can be switched off.":"");
var LS={get:function(k){try{return localStorage.getItem('cbp_'+k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem('cbp_'+k,v)}catch(e){}}};
function fixStr(t){if(!t||typeof t!='string')return t;
 if(t.indexOf('!')>-1)t=t.replace(/\?!+/g,'?').replace(/!+(?=\s*[A-Za-z0-9\u00C0-\u024F])/g,'.').replace(/!+/g,'');
 if(/pay\s?pal/i.test(t))t=t.replace(/pay\s?pal(\.me)?/ig,'PayID');
 if(/personal[- ]use licen[cs]e only[^.]*\.?|no resale\.?/i.test(t))t=t.replace(/personal[- ]use licen[cs]e only[^.]*\.?/ig,'').replace(/\bno resale\.?/ig,'');
 return t}
var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,NOSCRIPT:1,CODE:1,PRE:1,TEMPLATE:1};
function fixNode(n){
 if(n.nodeType==3){var p=n.parentNode;if(!p||SKIP[p.nodeName])return;var v=n.nodeValue;if(v&&/!|pay\s?pal|personal[- ]use licen|no resale/i.test(v)){var w=fixStr(v);if(w!==v)n.nodeValue=w}return}
 if(n.nodeType!=1||SKIP[n.nodeName])return;
 ['title','placeholder','aria-label','alt'].forEach(function(a){var v=n.getAttribute&&n.getAttribute(a);if(v&&/!|pay\s?pal/i.test(v))n.setAttribute(a,fixStr(v))});
 if((n.nodeName=='INPUT')&&/^(button|submit|reset)$/i.test(n.type)&&/!|pay\s?pal/i.test(n.value))n.value=fixStr(n.value);
 if(n.nodeName=='A'){var h=n.getAttribute('href')||'';if(/paypal\.(com|me)/i.test(h)){n.setAttribute('href','#');n.setAttribute('data-cbp-payid','1')}}
 if(n.nodeName=='IFRAME'&&/paypal/i.test(n.src||''))n.remove();
 var c=n.firstChild;while(c){var nx=c.nextSibling;fixNode(c);c=nx}}
function payPop(){toast(PAYID,9000)}
D.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[data-cbp-payid]');if(a){e.preventDefault();payPop()}},true);
function wrapText(proto,name){var orig=proto[name];proto[name]=function(t,x,y,w){if(typeof t=='string')t=fixStr(t);return w===undefined?orig.call(this,t,x,y):orig.call(this,t,x,y,w)}}
try{wrapText(CanvasRenderingContext2D.prototype,'fillText');wrapText(CanvasRenderingContext2D.prototype,'strokeText')}catch(e){}
function isCalm(){return LS.get('calm')=='1'}
function applyCalm(){var on=isCalm();window.CB_CALM=on;D.documentElement.classList.toggle('cbp-calm',on);
 [].forEach.call(D.querySelectorAll('audio,video'),function(m){if(on){if(!m.muted){m.muted=true;m.dataset.cbpMuted=1}}else if(m.dataset.cbpMuted){m.muted=false;delete m.dataset.cbpMuted}})}
function applyBig(){var on=LS.get('big')=='1';D.documentElement.classList.toggle('cbp-big',on);
 var els=D.body?D.body.querySelectorAll('*'):[];for(var i=0;i<els.length;i++){var el=els[i];if(SKIP[el.nodeName]||el.nodeName=='CANVAS'||el.closest('#cbp-menu'))continue;
  var has=false;for(var c=el.firstChild;c;c=c.nextSibling)if(c.nodeType==3&&c.nodeValue.trim()){has=true;break}
  if(!has&&!/^(INPUT|SELECT|BUTTON)$/.test(el.nodeName))continue;
  if(on){if(el.dataset.cbpFs)continue;var fs=parseFloat(getComputedStyle(el).fontSize)||16;el.dataset.cbpFs=el.style.fontSize||'-';el.style.fontSize=Math.max(fs*1.25,18)+'px'}
  else if(el.dataset.cbpFs){el.style.fontSize=el.dataset.cbpFs=='-'?'':el.dataset.cbpFs;delete el.dataset.cbpFs}}}
function say(t){try{if(!('speechSynthesis' in window)){toast('Read aloud is not available on this device.');return}speechSynthesis.cancel();if(!t)return;var u=new SpeechSynthesisUtterance(String(t).slice(0,3000));u.lang='en-AU';u.rate=.95;speechSynthesis.speak(u)}catch(e){}}
function pageText(){var sel=String(window.getSelection&&getSelection()||'').trim();if(sel)return sel;
 var out=[],n=0,w=D.createTreeWalker(D.body,NodeFilter.SHOW_TEXT,null,false),t;
 while((t=w.nextNode())&&n<1500){var p=t.parentNode;if(SKIP[p.nodeName]||p.closest('#cbp-menu,#cbp-pop,#cb-contact,#cbRadio,[aria-hidden=true]'))continue;var r=p.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight)continue;var v=t.nodeValue.replace(/\s+/g,' ').trim();if(v.length>1){out.push(v);n+=v.length}}
 return out.join('. ').replace(/\.\s*\./g,'.')}
var css='#cbp-btn{position:fixed;right:10px;bottom:60px;z-index:2147483600;min-width:46px;height:46px;border-radius:23px;border:2px solid #ffd84d;background:#1d120c;color:#ffd84d;font:700 16px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px #0007;padding:0 12px;opacity:.92}'+
'#cbp-menu{position:fixed;right:10px;bottom:112px;z-index:2147483601;background:#1d120c;color:#fff;border:2px solid #ffd84d;border-radius:14px;padding:8px;display:none;flex-direction:column;gap:6px;width:min(250px,80vw);max-height:70vh;overflow:auto;font:15px system-ui,sans-serif;box-shadow:0 4px 18px #0009}'+
'#cbp-menu.on{display:flex}#cbp-menu button{all:unset;box-sizing:border-box;display:block;padding:10px 12px;border-radius:10px;background:#3a2a20;color:#fff;cursor:pointer;font:600 15px system-ui,sans-serif;text-align:left}#cbp-menu button:hover,#cbp-menu button:focus{background:#5a4030;outline:2px solid #ffd84d}#cbp-menu button[aria-pressed=true]{background:#ffd84d;color:#1d120c}'+
'#cbp-pop{position:fixed;inset:0;z-index:2147483602;background:#000b;display:flex;align-items:center;justify-content:center;padding:12px}#cbp-pop .bx{background:#fffaf3;color:#2a1a10;max-width:520px;width:100%;max-height:88vh;overflow:auto;border-radius:16px;padding:18px;font:16px/1.5 system-ui,sans-serif;box-sizing:border-box}#cbp-pop h2{margin:0 0 8px;font-size:20px}'+
'#cbp-pop .bx button{margin:10px 8px 0 0;padding:10px 18px;border:0;border-radius:999px;background:#6b3e26;color:#fff;font:600 15px system-ui;cursor:pointer}#cbp-pop img{height:44px;float:right;margin-left:8px;border-radius:8px}'+
'#cbp-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);max-width:92vw;background:#2a1d14;color:#fff;padding:12px 18px;border-radius:12px;z-index:2147483647;font:15px system-ui,sans-serif;box-shadow:0 4px 14px #0007}'+
'#cb-rights.cbp-auto{max-width:760px;margin:16px auto 90px;padding:12px 16px;font:13px/1.45 system-ui,sans-serif;text-align:center;opacity:.9;clear:both}#cb-rights.cbp-auto img{height:42px;display:block;margin:0 auto 6px;border-radius:6px}'+
'html.cbp-calm *,html.cbp-calm *:before,html.cbp-calm *:after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important;scroll-behavior:auto!important}html.cbp-calm body{filter:saturate(.75) brightness(.97)}'+
'@media(max-width:600px){#cbp-btn{bottom:64px;right:8px}}';
function toast(m,ms){var t=D.getElementById('cbp-toast');if(t)t.remove();t=D.createElement('div');t.id='cbp-toast';t.setAttribute('role','status');t.textContent=fixStr(m);D.body.appendChild(t);setTimeout(function(){t.remove()},ms||3500)}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function close(){var p=D.getElementById('cbp-pop');if(p)p.remove()}
function pop(title,html){close();var p=D.createElement('div');p.id='cbp-pop';p.setAttribute('role','dialog');
 p.innerHTML='<div class="bx"><img src="'+LOGO+'" alt="Coffeebreak" onerror="this.remove()"><h2></h2><div class="ct"></div><button type="button" data-a="read">Read aloud</button><button type="button" data-a="close">Close</button></div>';
 p.querySelector('h2').textContent=title;p.querySelector('.ct').innerHTML=html;
 p.addEventListener('click',function(e){var a=e.target.getAttribute&&e.target.getAttribute('data-a');if(e.target===p||a=='close'){say('');p.remove()}else if(a=='read')say(title+'. '+p.querySelector('.ct').innerText)});
 D.body.appendChild(p);fixNode(p);p.querySelector('[data-a=close]').focus()}
function howTo(){var md=D.querySelector('meta[name=description]');var intro=HOW||(md&&md.content)||'';var steps=[];
 if(HOW)steps=HOW.split(/\s*\|\s*/);else{steps=[intro||('Welcome to '+APP+'.'),'Tap or click the buttons on the screen to play and explore.','Use the Aa Help button any time for bigger text, calm mode, read aloud, sharing or full screen.'];if(D.querySelector('canvas'))steps.splice(1,0,'Drag on the picture with a finger, mouse or stylus.')}
 steps.push('Something not working? Press the yellow ? button to send a report.');
 pop('How to play '+APP,'<ol>'+steps.map(function(x){return '<li>'+esc(fixStr(x))+'</li>'}).join('')+'</ol>')}
function link(){return (location.protocol=='http:'||location.protocol=='https:')&&!/itch\.zone|hwcdn|localhost|127\.0/.test(location.host)?location.href:URL0}
function share(){var u=link(),t=APP+' by Coffeebreak';
 if(navigator.share){navigator.share({title:t,text:t,url:u}).catch(function(){});return}
 pop('Share '+APP,'<p>Copy this link and send it to a friend.</p><p><input id="cbp-link" readonly style="width:100%;padding:8px;font:15px system-ui" value="'+esc(u)+'"></p><button type="button" id="cbp-copy">Copy link</button>');
 D.getElementById('cbp-copy').onclick=function(){var i=D.getElementById('cbp-link');i.select();try{navigator.clipboard.writeText(u).then(function(){toast('Link copied')},function(){D.execCommand('copy');toast('Link copied')})}catch(e){D.execCommand('copy');toast('Link copied')}}}
function fs(){var d=D.documentElement;try{if(D.fullscreenElement||D.webkitFullscreenElement){(D.exitFullscreen||D.webkitExitFullscreen).call(D)}else{var r=d.requestFullscreen||d.webkitRequestFullscreen;if(r)r.call(d);else toast('Full screen is not available here. On iPhone, use Share then Add to Home Screen.')}}catch(e){toast('Full screen is not available here.')}}
function report(){var b=D.getElementById('cbr-btn');if(b){b.click();return}
 pop('Report a problem','<p>Tell Coffeebreak what went wrong and we will fix it.</p><p>Email: coffeebreakhq@mail.grokbot.com</p><p>Please include the name of this '+esc(KIND)+': '+esc(APP)+'.</p>')}
function findBtn(re){var bs=D.querySelectorAll('button,[role=button],input[type=button]');for(var i=0;i<bs.length;i++){var b=bs[i];if(b.closest('#cbp-menu,#cbp-pop'))continue;var t=(b.textContent||b.value||'')+' '+(b.title||'')+' '+(b.getAttribute('aria-label')||'');if(re.test(t)&&b.offsetParent!==null)return b}return null}
var U=[],R=[],cv=null;
function bigCanvas(){var best=null,a=0;[].forEach.call(D.querySelectorAll('canvas'),function(c){var r=c.getBoundingClientRect(),s=r.width*r.height;if(s>a){a=s;best=c}});return best}
function snap(){try{var c=bigCanvas();if(!c)return;cv=c;U.push(c.getContext('2d').getImageData(0,0,c.width,c.height));if(U.length>30)U.shift();R.length=0}catch(e){}}
function put(img){try{cv.getContext('2d').putImageData(img,0,0)}catch(e){}}
function undo(){var b=findBtn(/\bundo\b|\u21b6|\u238c/i);if(b){b.click();return}
 if(!cv||!U.length){toast('Nothing to undo');return}var c=cv;R.push(c.getContext('2d').getImageData(0,0,c.width,c.height));put(U.pop())}
function redo(){var b=findBtn(/\bredo\b|\u21b7/i);if(b){b.click();return}
 if(!cv||!R.length){toast('Nothing to redo');return}var c=cv;U.push(c.getContext('2d').getImageData(0,0,c.width,c.height));put(R.pop())}
if(DRAW)D.addEventListener('pointerdown',function(e){if(e.target&&e.target.nodeName=='CANVAS'&&e.target===bigCanvas())snap()},true);
D.addEventListener('keydown',function(e){if(!(e.ctrlKey||e.metaKey))return;var t=e.target&&e.target.nodeName;if(t=='INPUT'||t=='TEXTAREA'||(e.target&&e.target.isContentEditable))return;var k=e.key.toLowerCase();
 if(k=='z'&&!e.shiftKey&&(DRAW||findBtn(/\bundo\b/i))){e.preventDefault();undo()}else if((k=='y'||(k=='z'&&e.shiftKey))&&(DRAW||findBtn(/\bredo\b/i))){e.preventDefault();redo()}});
var logoImg=new Image();logoImg.src=LOGO;
function isImgDl(a){var h=a.href||'';return a.hasAttribute('download')&&!a.dataset.cbpDone&&(/^data:image\/(png|jpe?g|webp)/i.test(h)||(/^blob:/.test(h)&&/\.(png|jpe?g|webp)$/i.test(a.getAttribute('download')||'')))}
function stamp(a,done){var im=new Image();im.onload=function(){try{var c=D.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;var x=c.getContext('2d');x.drawImage(im,0,0);
 if(logoImg.complete&&logoImg.naturalWidth){var w=Math.max(40,c.width*.14),h=w*logoImg.naturalHeight/logoImg.naturalWidth;x.globalAlpha=.9;x.drawImage(logoImg,c.width-w-c.width*.02,c.height-h-c.width*.02,w,h);x.globalAlpha=1}
 a.href=c.toDataURL('image/png');var n=a.getAttribute('download')||'coffeebreak.png';a.setAttribute('download',n.replace(/\.(jpe?g|webp)$/i,'.png'))}catch(e){}done()};im.onerror=done;im.src=a.href}
var aClick=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){var a=this;if(isImgDl(a)){a.dataset.cbpDone=1;stamp(a,function(){aClick.call(a);delete a.dataset.cbpDone});return}return aClick.call(a)};
D.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a');if(a&&isImgDl(a)){e.preventDefault();e.stopPropagation();a.dataset.cbpDone=1;stamp(a,function(){aClick.call(a);delete a.dataset.cbpDone})}},true);
function autosave(){var key=location.pathname.replace(/[^a-z0-9]/ig,'_');
 [].forEach.call(D.querySelectorAll('textarea'),function(t,i){if(t.closest('form,#cb-contact,#cbr-pop,#cbp-pop')||/mail|message|contact|report|card|pass/i.test(t.name+' '+t.id+' '+t.placeholder)||t.dataset.cbpAs)return;
  t.dataset.cbpAs=1;var k='as'+key+'_'+(t.id||i);var v=LS.get(k);if(v&&!t.value){t.value=v;try{t.dispatchEvent(new Event('input',{bubbles:true}))}catch(e){}}
  var tm;t.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){LS.set(k,t.value)},400)})})}
function footer(){if(D.getElementById('cb-rights')){var r=D.getElementById('cb-rights');if(!r.querySelector('img[src*=logo]')){var i=D.createElement('img');i.src=LOGO;i.alt='Coffeebreak logo';i.style.cssText='height:40px;display:block;margin:0 auto 6px;border-radius:6px';i.onerror=function(){i.remove()};r.insertBefore(i,r.firstChild)}
  if(!/keeps all rights/.test(r.textContent)){var p=D.createElement('p');p.textContent=DISC;r.appendChild(p)}return}
 if(/keeps all rights/.test(D.body.textContent))return;
 var f=D.createElement('div');f.id='cb-rights';f.className='cbp-auto';f.innerHTML='<img src="'+LOGO+'" alt="Coffeebreak logo" onerror="this.remove()"><div></div>';f.lastChild.textContent=DISC;D.body.appendChild(f)}
function menu(){var b=D.createElement('button');b.id='cbp-btn';b.type='button';b.textContent='Aa Help';b.setAttribute('aria-label','Help, bigger text, calm mode and more');b.setAttribute('aria-expanded','false');
 var m=D.createElement('div');m.id='cbp-menu';m.setAttribute('role','menu');
 var items=[['how','How to play'],['big','A+ Bigger text'],['calm','Calm mode'],['read','Read aloud this screen'],['undo','Undo'],['redo','Redo'],['fs','Full screen'],['share','Share'],['report','Report a problem'],['pay','How to pay']];
 items.forEach(function(it){var x=D.createElement('button');x.type='button';x.setAttribute('role','menuitem');x.dataset.a=it[0];x.textContent=it[1];if(it[0]=='big'||it[0]=='calm')x.setAttribute('aria-pressed',LS.get(it[0])=='1'?'true':'false');m.appendChild(x)});
 function upd(){var dr=DRAW||!!findBtn(/\bundo\b/i);[].forEach.call(m.querySelectorAll('[data-a=undo],[data-a=redo]'),function(x){x.style.display=dr?'':'none'})}
 b.onclick=function(){var on=!m.classList.contains('on');upd();m.classList.toggle('on',on);b.setAttribute('aria-expanded',on)};
 m.onclick=function(e){var x=e.target.closest('button');if(!x)return;var a=x.dataset.a;
  if(a=='big'||a=='calm'){var v=LS.get(a)=='1'?'0':'1';LS.set(a,v);x.setAttribute('aria-pressed',v=='1');if(a=='big')applyBig();else applyCalm();toast((a=='big'?'Bigger text ':'Calm mode ')+(v=='1'?'on':'off'));return}
  m.classList.remove('on');b.setAttribute('aria-expanded','false');
  ({how:howTo,read:function(){say(pageText())},undo:undo,redo:redo,fs:fs,share:share,report:report,pay:payPop})[a]()};
 D.body.appendChild(b);D.body.appendChild(m)}
function init(){if(!D.body)return;
 if(!D.querySelector('meta[name=viewport]')){var v=D.createElement('meta');v.name='viewport';v.content='width=device-width,initial-scale=1';D.head.appendChild(v)}
 var st=D.createElement('style');st.id='cbp-css';st.textContent=css;D.head.appendChild(st);
 fixNode(D.body);if(D.title&&/!|pay\s?pal/i.test(D.title))D.title=fixStr(D.title);
 menu();footer();autosave();applyCalm();if(LS.get('big')=='1')applyBig();
 try{new MutationObserver(function(ms){ms.forEach(function(m){if(m.type=='characterData')fixNode(m.target);else [].forEach.call(m.addedNodes,fixNode)});if(isCalm())applyCalm()}).observe(D.body,{childList:true,subtree:true,characterData:true})}catch(e){}
 setTimeout(autosave,1500)}
window.CBPlus={fix:fixStr,say:say,howTo:howTo,share:share,undo:undo,redo:redo,snap:snap,report:report,toast:toast,payid:PAYID,disclaimer:DISC};
if(D.readyState=='loading')D.addEventListener('DOMContentLoaded',init);else init();
})();
