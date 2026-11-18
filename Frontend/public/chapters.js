
(function(){
'use strict';
var $=function(s){return document.querySelector(s)},$$=function(s){return[].slice.call(document.querySelectorAll(s))};
var isAdmin=false,founderApiAvailable=false;
var API_BASE=(location.hostname==='localhost'||location.hostname==='127.0.0.1')?'':'https://fortune-intern-developers-backend.vercel.app';
function canEditFounders(){return isAdmin&&founderApiAvailable}
function setAccountUI(account){
var name=String(account.name||account.email||'FIN member');
$('#accountName').textContent=name;
$('#accountAvatar').textContent=initials(name);
$('#accountLink').setAttribute('aria-label','Open profile for '+name);
$('#accountLink').title='Open profile for '+name;
$('#accountLink').hidden=false;
$('#navSignIn').hidden=true;
$('#mnavSignIn').hidden=true;
$('#mnavAccount').hidden=false
}
var sessionToken=localStorage.getItem('fortune-intern-access-token')||sessionStorage.getItem('fortune-intern-access-token');
if(!sessionToken){location.replace('/login?returnTo=%2Fchapters.html');return}
function setAdminControls(){
['chAdd','chImport','heroImport','drAddSeat','manageChapterApps'].forEach(function(id){var el=document.getElementById(id);if(el)el.hidden=!isAdmin});
$('#fAdd').hidden=!canEditFounders();
}
function verifySession(){
return fetch(API_BASE+'/api/auth/me',{headers:{Authorization:'Bearer '+sessionToken},credentials:'include'}).then(function(r){
if(r.status===401||r.status===403){localStorage.removeItem('fortune-intern-access-token');sessionStorage.removeItem('fortune-intern-access-token');location.replace('/login?returnTo=%2Fchapters.html');return null}
if(!r.ok)throw new Error('Account verification failed ('+r.status+')');
return r.json()
}).then(function(account){
if(!account)return;
isAdmin=account.is_admin===true;
setAdminControls();
setAccountUI(account);
$('#authGateMessage').textContent='Loading the shared chapter directory…';
return loadDirectory().then(function(){
document.documentElement.classList.add('auth-ready');
if(currentTab==='founders')renderFounders()
})
}).catch(function(){
$('#authGateMessage').textContent='We could not verify your account right now. Please try again or sign in again.';
$('#authGateRetry').style.display='inline-block';
$('#authGateRetry').onclick=verifySession;
$('#authGateSignIn').textContent='Go to sign in';
$('#authGateSignIn').href='/login?returnTo=%2Fchapters.html'
})}
var toastT;function toast(m,u){var t=$('#toast');t.innerHTML='';t.appendChild(document.createTextNode(m));if(u){var b=document.createElement('button');b.textContent='Undo';b.onclick=function(){u();t.classList.remove('show')};t.appendChild(b)}t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show')},u?7000:2800)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function initials(n){if(!n)return'FIN';return n.trim().split(/\s+/).slice(0,2).map(function(w){return w[0]}).join('').toUpperCase()}
function saveLS(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(error){toast('Could not save local data: '+error.message);return false}}
function loadLS(k,f){try{var v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(error){toast('Saved chapter data could not be read: '+error.message);return f}}
function processImage(file,cb){if(!file)return;if(file.size>10*1024*1024){toast('Image too large — keep under 10 MB');return}var r=new FileReader();r.onload=function(){var img=new Image();img.onload=function(){var max=900,s=Math.min(1,max/Math.max(img.width,img.height));var c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.82))};img.onerror=function(){toast('Could not read that image')};img.src=r.result};r.readAsDataURL(file)}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)}
function dl(b,n){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}

var CHAPTERS=[
{id:'ug',name:'University of Ghana Chapter',inst:'University of Ghana (UG), Legon',city:'Legon',region:'Greater Accra',type:'Public University'},
{id:'knust',name:'KNUST Chapter',inst:'Kwame Nkrumah University of Science and Technology',city:'Kumasi',region:'Ashanti',type:'Public University'},
{id:'ucc',name:'UCC Chapter',inst:'University of Cape Coast',city:'Cape Coast',region:'Central',type:'Public University'},
{id:'uew',name:'UEW Chapter',inst:'University of Education, Winneba',city:'Winneba',region:'Central',type:'Public University'},
{id:'uds',name:'UDS Chapter',inst:'University for Development Studies',city:'Tamale',region:'Northern',type:'Public University'},
{id:'umat',name:'UMaT Chapter',inst:'University of Mines and Technology',city:'Tarkwa',region:'Western',type:'Public University'},
{id:'uhas',name:'UHAS Chapter',inst:'University of Health and Allied Sciences',city:'Ho',region:'Volta',type:'Public University'},
{id:'uenr',name:'UENR Chapter',inst:'University of Energy and Natural Resources',city:'Sunyani',region:'Bono',type:'Public University'},
{id:'uesd',name:'UESD Chapter',inst:'University of Environment and Sustainable Development',city:'Somanya',region:'Eastern',type:'Public University'},
{id:'gctu',name:'GCTU Chapter',inst:'Ghana Communication Technology University',city:'Accra',region:'Greater Accra',type:'Public University'},
{id:'upsa',name:'UPSA Chapter',inst:'University of Professional Studies, Accra',city:'Accra',region:'Greater Accra',type:'Public University'},
{id:'cktutas',name:'CKT-UTAS Chapter',inst:'C.K. Tedam University of Technology and Applied Sciences',city:'Navrongo',region:'Upper East',type:'Public University'},
{id:'sddubids',name:'SDD-UBIDS Chapter',inst:'Simon Diedong Dombo University of Business and Integrated Development Studies',city:'Wa',region:'Upper West',type:'Public University'},
{id:'aamusted',name:'AAMUSTED Chapter',inst:'Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development',city:'Kumasi',region:'Ashanti',type:'Public University'},
{id:'atu',name:'Accra Technical University Chapter',inst:'Accra Technical University',city:'Accra',region:'Greater Accra',type:'Technical University'},
{id:'kstu',name:'Kumasi Technical University Chapter',inst:'Kumasi Technical University',city:'Kumasi',region:'Ashanti',type:'Technical University'},
{id:'ttu',name:'Takoradi Technical University Chapter',inst:'Takoradi Technical University',city:'Takoradi',region:'Western',type:'Technical University'},
{id:'htu',name:'Ho Technical University Chapter',inst:'Ho Technical University',city:'Ho',region:'Volta',type:'Technical University'},
{id:'tatu',name:'Tamale Technical University Chapter',inst:'Tamale Technical University',city:'Tamale',region:'Northern',type:'Technical University'},
{id:'ktu',name:'Koforidua Technical University Chapter',inst:'Koforidua Technical University',city:'Koforidua',region:'Eastern',type:'Technical University'},
{id:'cctu',name:'Cape Coast Technical University Chapter',inst:'Cape Coast Technical University',city:'Cape Coast',region:'Central',type:'Technical University'},
{id:'stu',name:'Sunyani Technical University Chapter',inst:'Sunyani Technical University',city:'Sunyani',region:'Bono',type:'Technical University'},
{id:'btu',name:'Bolgatanga Technical University Chapter',inst:'Bolgatanga Technical University',city:'Bolgatanga',region:'Upper East',type:'Technical University'},
{id:'wtu',name:'Wa Technical University Chapter',inst:'Wa Technical University',city:'Wa',region:'Upper West',type:'Technical University'},
{id:'dhltu',name:'Dr. Hilla Limann Technical University Chapter',inst:'Dr. Hilla Limann Technical University',city:'Tumu',region:'Upper West',type:'Technical University'},
{id:'ashesi',name:'Ashesi University Chapter',inst:'Ashesi University',city:'Berekuso',region:'Eastern',type:'Private / Specialised'},
{id:'gimpa',name:'GIMPA Chapter',inst:'Ghana Institute of Management and Public Administration',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'central',name:'Central University Chapter',inst:'Central University',city:'Miotso',region:'Greater Accra',type:'Private / Specialised'},
{id:'vvu',name:'Valley View University Chapter',inst:'Valley View University',city:'Oyibi',region:'Greater Accra',type:'Private / Specialised'},
{id:'presby',name:'Presbyterian University Chapter',inst:'Presbyterian University Ghana',city:'Abetifi',region:'Eastern',type:'Private / Specialised'},
{id:'methodist',name:'Methodist University Chapter',inst:'Methodist University Ghana',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'pentecost',name:'Pentecost University Chapter',inst:'Pentecost University',city:'Sowutuom',region:'Greater Accra',type:'Private / Specialised'},
{id:'academiccity',name:'Academic City Chapter',inst:'Academic City University College',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'lancaster',name:'Lancaster University Ghana Chapter',inst:'Lancaster University Ghana',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'wisconsin',name:'Wisconsin International Chapter',inst:'Wisconsin International University College',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'allnations',name:'All Nations University Chapter',inst:'All Nations University',city:'Koforidua',region:'Eastern',type:'Private / Specialised'},
{id:'regent',name:'Regent University Chapter',inst:'Regent University College of Science and Technology',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'knutsford',name:'Knutsford University Chapter',inst:'Knutsford University College',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'zenith',name:'Zenith University Chapter',inst:'Zenith University College',city:'Accra',region:'Greater Accra',type:'Private / Specialised'},
{id:'datalink',name:'Data Link Institute Chapter',inst:'Data Link Institute',city:'Tema',region:'Greater Accra',type:'Private / Specialised'},
{id:'other',name:'Other Institution Chapter',inst:'Colleges of Education, Nursing and other accredited institutions',city:'Nationwide',region:'Ghana',type:'Other Institution'}];
var ROLES=[
{role:'Campus Ambassador',resp:['Represent FIN at the institution','Drive campus strategy and administrative relations','Lead chapter growth and partnerships']},
{role:'Chapter President',resp:['Lead executive meetings and chapter strategy','Align chapter goals with FIN Corporate','Approve chapter creatives and reports']},
{role:'Vice President / Operations Lead',resp:['Coordinate committees and internal workflows','Verify figures before monthly submission','Report placement numbers to Corporate']},
{role:'General Secretary',resp:['Manage documentation, minutes and records','Handle official correspondence','File monthly reports with FIN Corporate']},
{role:'Deputy General Secretary',resp:['Assist record keeping and administration','Track member attendance and engagement','Deputise in the Secretary absence']},
{role:'Financial Secretary & Treasurer',resp:['Manage budget allocations and the ledger','Track dues and issue receipts','Prepare financial audit disclosures']},
{role:'PR & Communications Director',resp:['Run communication campaigns','Manage media partnerships and outreach','Coordinate the chapter public voice']},
{role:'Media Head',resp:['Capture live event media','Schedule and publish content','Publish highlights within 48 hours']},
{role:'Graphic Designer',resp:['Produce flyers, decks and creatives','Maintain the approved logo and colours','Prepare communication templates']},
{role:'Programs & Training Coordinator',resp:['Schedule every-3-weeks speaking cycles','Run the one month skills bootcamp','Coordinate placement drives']},
{role:'Chapter Patron',resp:['Provide institutional and academic oversight','Review escalated disciplinary matters','Guide constitutional compliance']}];
var FOUND_SEED=[
{id:'f1',name:'Emmanuel Amoasi',title:'Founder & Managing Director',bio:'Founded Fortune Intern Network and leads national strategy, corporate partnerships and the campus chapter ecosystem.',email:'amoasie173@gmail.com',phone:'+233 25 703 8948',photo:null},
{id:'f2',name:'Prof. Prince Boakye Frimpong',title:'Founding Patron',bio:'Senior academic faculty member providing institutional guidance, academic backing and administrative oversight since ratification.',email:'',phone:'+233 26 235 8269',photo:null},
{id:'f3',name:'Mawuli Diekpor',title:'Founding General Secretary · KNUST',bio:'Kept the founding records, minutes and official correspondence of the first chapter at KNUST.',email:'',phone:'',photo:null},
{id:'f4',name:'',title:'Founding Campus Ambassador · KNUST',bio:'Open founding seat — first institutional envoy of the network.',email:'',phone:'',photo:null},
{id:'f5',name:'',title:'Founding Chapter President · KNUST',bio:'Open founding seat — first president of the pioneer chapter.',email:'',phone:'',photo:null},
{id:'f6',name:'',title:'Founding Operations Lead',bio:'Open founding seat — first national operations coordinator.',email:'',phone:'',photo:null}];
function buildSeats(){var out=[],n=0;CHAPTERS.forEach(function(c){ROLES.forEach(function(r){out.push({id:'s'+(++n),name:'',role:r.role,chapter:c.id,status:'seat',email:'',phone:'',bio:'',resp:r.resp.slice(),photo:null})})});
for(var i=0;i<out.length;i++)if(out[i].chapter==='knust'&&out[i].role==='General Secretary'){Object.assign(out[i],{name:'Mawuli Diekpor',status:'active',bio:'General Secretary of the KNUST Chapter. Keeps chapter records, minutes and official correspondence in order.'});break}
return out}
var CH=[],DIR=[],directoryLoadState='loading';
var FOUND=loadLS('fin_found_v6',null);if(!Array.isArray(FOUND)||!FOUND.length){FOUND=FOUND_SEED.slice();saveLS('fin_found_v6',FOUND)}
window.FIN_SEED={chapters:CH,executives:DIR,founders:FOUND};
function chapter(id){for(var i=0;i<CH.length;i++)if(CH[i].id===id)return CH[i];return{id:id,name:id,inst:'',city:'',region:'',type:'Other Institution'}}
var directorySaveTimer=null,directorySaveQueue=Promise.resolve();
function persist(){
saveLS('fin_found_v6',FOUND);
if(!isAdmin)return;
clearTimeout(directorySaveTimer);
directorySaveTimer=setTimeout(function(){
directorySaveQueue=directorySaveQueue.catch(function(error){toast('Chapter directory sync failed: '+error.message)}).then(saveDirectory).catch(function(error){toast('Chapter directory sync failed: '+error.message)})
},350)}
function findExec(id){for(var i=0;i<DIR.length;i++)if(DIR[i].id===id)return DIR[i];return null}
function findFounder(id){for(var i=0;i<FOUND.length;i++)if(FOUND[i].id===id)return FOUND[i];return null}
function displayName(e){return e.name||e.role}
function founderRequest(method,id,data){
if(!canEditFounders())return Promise.reject(new Error('Administrator access is required.'));
var token=localStorage.getItem('fortune-intern-access-token')||sessionStorage.getItem('fortune-intern-access-token');
if(!token)return Promise.reject(new Error('Sign in again to manage founding profiles.'));
return fetch(API_BASE+'/api/founders/'+encodeURIComponent(id),{method:method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},credentials:'include',body:data?JSON.stringify(data):undefined}).then(function(r){
if(r.status===204)return null;
if(!r.ok)return r.text().then(function(text){var message='Unable to save the founding profile ('+r.status+').';try{var body=JSON.parse(text);if(typeof body.detail==='string')message=body.detail}catch{throw new Error(message)}throw new Error(message)});
return r.json()})}
function chapterRequest(path,method,data){
return fetch(API_BASE+path,{method:method||'GET',headers:{Authorization:'Bearer '+sessionToken,'Content-Type':'application/json'},credentials:'include',body:data?JSON.stringify(data):undefined}).then(function(r){
return r.text().then(function(text){var body=null;if(text){try{body=JSON.parse(text)}catch{if(r.ok)throw new Error('Chapter API returned invalid JSON.');}}
if(!r.ok)throw new Error(body&&typeof body.detail==='string'?body.detail:'Chapter request failed ('+r.status+').');
return body})})}
function saveDirectory(){
return chapterRequest('/api/chapters','PUT',{chapters:CH,executives:DIR}).then(function(directory){
if(!directory||!Array.isArray(directory.chapters)||!Array.isArray(directory.executives))throw new Error('The server did not return the saved chapter directory.');
$('#apiPill').textContent='Shared directory · Live';
directoryLoadState='ready'
})}
function loadDirectory(){
return chapterRequest('/api/chapters').then(function(directory){
if(directory!==null){
if(!Array.isArray(directory.chapters)||!Array.isArray(directory.executives))throw new Error('The server returned an invalid chapter directory.');
CH.length=0;directory.chapters.forEach(function(c){CH.push(c)});
DIR.length=0;directory.executives.forEach(function(e){DIR.push(e)});
directoryLoadState='ready';
$('#apiPill').textContent='Shared directory · Live';refreshAll();return
}
if(isAdmin){
CHAPTERS.forEach(function(c){CH.push(c)});
buildSeats().forEach(function(e){DIR.push(e)});
directoryLoadState='ready';refreshAll();return saveDirectory()
}
directoryLoadState='empty';
$('#apiPill').textContent='Awaiting admin setup';
refreshAll()
}).catch(function(error){
CH.length=0;DIR.length=0;directoryLoadState='error';
$('#apiPill').textContent='Directory unavailable';
refreshAll();toast('Chapter directory is unavailable: '+error.message)
})}
var activePosition=null;
function openPositionApplication(position){
if(!position||position.status!=='seat'){toast('This chapter position is currently filled.');return}
var c=chapter(position.chapter);
activePosition={chapter_id:c.id,chapter_name:c.name,position_title:position.role};
$('#positionApplicationContext').textContent=c.name+' · '+position.role;
$('#positionApplicationMotivation').value='';
$('#positionApplicationModal').classList.add('open')}
function renderChapterApplications(applications,admin){
var list=$('#chapterApplicationsList');
if(!applications.length){list.textContent='No position applications yet.';return}
list.innerHTML=applications.map(function(a){
var applicant=admin?'<p><b>'+esc(a.applicant_name||'FIN member')+'</b> · '+esc(a.applicant_email||'')+'</p>':'';
var controls=admin?'<div class="macts"><select data-app-status="'+esc(a.id)+'"><option value="pending"'+(a.status==='pending'?' selected':'')+'>Pending</option><option value="under_review"'+(a.status==='under_review'?' selected':'')+'>Under review</option><option value="accepted"'+(a.status==='accepted'?' selected':'')+'>Accepted</option><option value="rejected"'+(a.status==='rejected'?' selected':'')+'>Rejected</option></select><button class="btn btn-navy btn-sm" data-app-save="'+esc(a.id)+'">Save status</button></div>':'';
return '<article style="border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0"><b>'+esc(a.chapter_name)+' · '+esc(a.position_title)+'</b><p>Status: '+esc(a.status.replace('_',' '))+' · '+esc(new Date(a.created_at).toLocaleDateString())+'</p>'+applicant+'<p style="white-space:pre-wrap;margin-top:8px">'+esc(a.motivation)+'</p>'+controls+'</article>'
}).join('');
if(admin)$$('[data-app-save]').forEach(function(button){button.onclick=function(){
var id=button.getAttribute('data-app-save'),select=$('[data-app-status="'+id+'"]');
chapterRequest('/api/chapter-applications/'+encodeURIComponent(id)+'/status','PATCH',{status:select.value}).then(function(){toast('Application status updated')}).catch(function(error){toast(error.message)})
}})
}
function openChapterApplications(admin){
if(admin&&!isAdmin){toast('Administrator access is required.');return}
$('#chapterApplicationsTitle').textContent=admin?'Review position applications':'My position applications';
$('#chapterApplicationsDescription').textContent=admin?'Review applicants and update each application status.':'Applications submitted from your FIN account.';
$('#chapterApplicationsList').textContent='Loading applications…';
$('#chapterApplicationsModal').classList.add('open');
chapterRequest(admin?'/api/chapter-applications':'/api/chapter-applications/mine').then(function(applications){
renderChapterApplications(applications,admin)
}).catch(function(error){$('#chapterApplicationsList').textContent=error.message})
}
$('#positionApplicationCancel').onclick=function(){$('#positionApplicationModal').classList.remove('open')};
$('#positionApplicationSubmit').onclick=function(){
var motivation=$('#positionApplicationMotivation').value.trim();
if(!activePosition)return;
if(motivation.length<20){toast('Please write at least 20 characters about your interest.');return}
chapterRequest('/api/chapter-applications','POST',{chapter_id:activePosition.chapter_id,chapter_name:activePosition.chapter_name,position_title:activePosition.position_title,motivation:motivation}).then(function(){
$('#positionApplicationModal').classList.remove('open');toast('Your application was submitted to FIN administrators.')
}).catch(function(error){toast(error.message)})
};
$('#myChapterApps').onclick=function(){openChapterApplications(false)};
$('#manageChapterApps').onclick=function(){openChapterApplications(true)};
$('#chapterApplicationsClose').onclick=function(){$('#chapterApplicationsModal').classList.remove('open')};
function loadFounders(){
fetch(API_BASE+'/api/founders').then(function(r){if(!r.ok)throw new Error('Founding team API returned '+r.status);return r.json()}).then(function(founders){
if(!Array.isArray(founders))throw new Error('Founding team API returned invalid data');
FOUND.length=0;founders.forEach(function(f){FOUND.push(f)});founderApiAvailable=true;persist();$('#fAdd').hidden=!canEditFounders();if(currentTab==='founders')renderFounders();
}).catch(function(){founderApiAvailable=false;$('#fAdd').hidden=true;if(isAdmin)toast('Founding team service is unavailable. Editing is disabled.');if(currentTab==='founders')renderFounders()})}
function saveFounder(data){
return founderRequest('PUT',data.id,data).then(function(founder){
var i=-1;FOUND.forEach(function(existing,index){if(existing.id===founder.id)i=index});
if(i===-1)FOUND.push(founder);else FOUND[i]=founder;
saveLS('fin_found_v6',FOUND);refreshAll();return founder})}
function deleteFounder(id){
return founderRequest('DELETE',id).then(function(){
var remaining=FOUND.filter(function(founder){return founder.id!==id});FOUND.length=0;remaining.forEach(function(founder){FOUND.push(founder)});saveLS('fin_found_v6',FOUND);refreshAll()})}
var currentTab='chapters';
function setTab(t){currentTab=t;$$('.tab').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-tab')===t)});
$$('.panel').forEach(function(p){p.classList.toggle('on',p.id==='panel-'+t)});
$$('.nav-links button,.mnav button[data-tab]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-tab')===t)});
$('#gMob').classList.remove('open');window.scrollTo({top:0});
if(t==='chapters')renderChapters();if(t==='founders')renderFounders();if(t==='blueprint')bpShow(bpCur)}
$$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){setTab(b.getAttribute('data-tab'))})});
$('#gBurger').onclick=function(){$('#gMob').classList.toggle('open')};

function renderMetrics(){var filled=DIR.filter(function(e){return e.name}).length;
$('#stChapters').textContent=CH.length;$('#stSeats').textContent=DIR.length;$('#stFilled').textContent=filled;
$('#stPct').textContent='('+Math.round(filled/(DIR.length||1)*100)+'%)';
$('#stPhotos').textContent=DIR.filter(function(e){return e.photo}).length+FOUND.filter(function(f){return f.photo}).length;
$('#tabChN').textContent=CH.length;$('#tabFoN').textContent=FOUND.length;$('#tabBpN').textContent=TOTAL}
var chState={q:'',type:'All',sort:'az'};
function chStats(id){var t=0,f=0,p=0;DIR.forEach(function(e){if(e.chapter===id){t++;if(e.name)f++;if(e.photo)p++}});return{t:t,f:f,p:p}}
function renderChapters(){renderMetrics();
var types=['All','Public University','Technical University','Private / Specialised','Other Institution'];
var cw=$('#chChips');cw.innerHTML='';types.forEach(function(t){var b=document.createElement('button');b.className='chip'+(chState.type===t?' on':'');b.textContent=t;b.onclick=function(){chState.type=t;renderChapters()};cw.appendChild(b)});
var q=chState.q.toLowerCase();
var arr=CH.filter(function(c){if(chState.type!=='All'&&c.type!==chState.type)return false;if(q&&(c.name+' '+c.inst+' '+c.city+' '+c.region).toLowerCase().indexOf(q)===-1)return false;return true});
if(chState.sort==='az')arr.sort(function(a,b){return a.name.localeCompare(b.name)});
if(chState.sort==='type')arr.sort(function(a,b){return a.type.localeCompare(b.type)||a.name.localeCompare(b.name)});
if(chState.sort==='filled')arr.sort(function(a,b){var x=chStats(a.id),y=chStats(b.id);return(y.f/(y.t||1))-(x.f/(x.t||1))});
$('#chCount').textContent=arr.length+' chapters shown · '+DIR.length+' seats tracked';
var g=$('#chGrid');g.innerHTML='';
if(!arr.length){var empty=document.createElement('p');empty.className='directory-empty';empty.textContent=CH.length?'No chapters match your search or filters.':directoryLoadState==='error'?'The shared directory could not be loaded. Refresh to try again.':directoryLoadState==='empty'?'No chapters have been published yet. Please check back soon.':'Loading the shared directory…';g.appendChild(empty);return}
arr.forEach(function(c){var s=chStats(c.id),pct=s.t?Math.round(s.f/s.t*100):0;
var cls=c.type==='Technical University'?'tech':c.type==='Private / Specialised'?'priv':c.type==='Other Institution'?'other':'';
var d=document.createElement('article');d.className='chcard '+cls;
d.innerHTML='<span class="ty">'+esc(c.type)+'</span><h3>'+esc(c.name)+'</h3><div class="inst">'+esc(c.inst)+'</div><div class="loc">'+esc(c.city)+(c.region?' · '+esc(c.region):'')+'</div><div class="bar"><i style="width:'+pct+'%"></i></div><div class="chstat"><span>'+s.f+'/'+s.t+' filled</span><span>'+s.p+' photos</span></div><div class="go">View board →</div>';
d.onclick=function(){openBoard(c.id)};g.appendChild(d)})}
$('#chSearch').addEventListener('input',function(){chState.q=this.value;renderChapters()});
$('#chSort').addEventListener('change',function(){chState.sort=this.value;renderChapters()});
$('#chAdd').onclick=function(){if(!isAdmin)return;$('#cmName').value='';$('#cmInst').value='';$('#cmCity').value='';$('#cmRegion').value='';$('#chapterModal').classList.add('open')};
$('#cmCancel').onclick=function(){$('#chapterModal').classList.remove('open')};
$('#cmSave').onclick=function(){if(!isAdmin){toast('Administrator access is required.');return}var n=$('#cmName').value.trim();if(!n){toast('Chapter name is required');return}
var id=slug(n)+'-'+Date.now().toString().slice(-4);
CH.push({id:id,name:n,inst:$('#cmInst').value.trim()||n,city:$('#cmCity').value.trim(),region:$('#cmRegion').value.trim(),type:$('#cmType').value});
ROLES.forEach(function(r,i){DIR.push({id:'n'+Date.now()+i,name:'',role:r.role,chapter:id,status:'seat',email:'',phone:'',bio:'',resp:r.resp.slice(),photo:null})});
persist();$('#chapterModal').classList.remove('open');refreshAll();toast('Chapter created with 11 seats')};
$('#chExport').onclick=function(){dl(new Blob([JSON.stringify({chapters:CH,executives:DIR,founders:FOUND},null,2)],{type:'application/json'}),'FIN_Chapters_Directory.json');toast('JSON exported')};
$('#chCsv').onclick=function(){var rows=[['Chapter','Institution','Name','Role','Status','Email','Phone']];
DIR.forEach(function(e){var c=chapter(e.chapter);rows.push([c.name,c.inst,e.name,e.role,e.status,e.email,e.phone])});
dl(new Blob([rows.map(function(r){return r.map(function(v){return'"'+String(v||'').replace(/"/g,'""')+'"'}).join(',')}).join('\n')],{type:'text/csv'}),'FIN_Chapters.csv');toast('CSV exported')};

var boardId=null;
function openBoard(id){boardId=id;$('#drAddSeat').hidden=!isAdmin;var c=chapter(id);
$('#drType').textContent=c.type;$('#drName').textContent=c.name;$('#drInst').textContent=c.inst+(c.city?' · '+c.city:'');
var b=$('#drBody');b.innerHTML='';
DIR.filter(function(e){return e.chapter===id}).forEach(function(e){var d=document.createElement('div');d.className='seat';
d.innerHTML='<span class="av">'+(e.photo?'<img src="'+e.photo+'" alt="">':'<span class="ini">'+esc(initials(e.name||e.role))+'</span>')+'</span><span class="nm"><b>'+esc(displayName(e))+'</b><span>'+esc(e.role)+'</span></span><span class="st'+(e.status==='seat'?' open':'')+'">'+(e.status==='seat'?(isAdmin?'Open':'Apply →'):'Active')+'</span>';
d.onclick=function(){if(isAdmin){openEdit(e.id);return}if(e.status==='seat'){openPositionApplication(e);return}toast('This chapter position is currently filled.')};b.appendChild(d)});
$('#drawer').classList.add('open');$('#drOverlay').classList.add('open')}
function closeBoard(){$('#drawer').classList.remove('open');$('#drOverlay').classList.remove('open');boardId=null}
$('#drClose').onclick=closeBoard;$('#drOverlay').onclick=closeBoard;
$('#drAddSeat').onclick=function(){if(isAdmin)openEdit(null,boardId)};
$('#drExportCh').onclick=function(){if(!boardId)return;var c=chapter(boardId);dl(new Blob([JSON.stringify({chapter:c,executives:DIR.filter(function(e){return e.chapter===boardId})},null,2)],{type:'application/json'}),'FIN_'+slug(c.name)+'.json');toast('Chapter exported')};

var editId=null,editPhoto=null;
function fillChapters(sel,val){var el=$(sel);el.innerHTML='';CH.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name;el.appendChild(o)});if(val)el.value=val}
function openEdit(id,preCh){if(!isAdmin)return;editId=id;var e=id?findExec(id):null;editPhoto=e?e.photo:null;
$('#emTitle').textContent=e?displayName(e):'New seat';
$('#emName').value=e?e.name:'';$('#emRole').value=e?e.role:'';$('#emEmail').value=e?e.email:'';$('#emPhone').value=e?e.phone:'';$('#emBio').value=e?e.bio:'';$('#emResp').value=e&&e.resp?e.resp.join('\n'):'';
fillChapters('#emChapter',e?e.chapter:(preCh||boardId||'knust'));$('#emStatus').value=e?e.status:'seat';renderEmPhoto();$('#editModal').classList.add('open')}
function renderEmPhoto(){$('#emPhoto').innerHTML=editPhoto?'<img src="'+editPhoto+'" alt="">':'<span class="ini">'+esc(initials($('#emName').value||$('#emRole').value||'FIN'))+'</span>'}
$('#emName').addEventListener('input',renderEmPhoto);$('#emRole').addEventListener('input',renderEmPhoto);
$('#emPhotoInput').addEventListener('change',function(){processImage(this.files[0],function(d){editPhoto=d;renderEmPhoto()});this.value=''});
$('#emPhotoClear').onclick=function(){editPhoto=null;renderEmPhoto()};
$('#emCancel').onclick=function(){$('#editModal').classList.remove('open')};
$('#emDelete').onclick=function(){if(!isAdmin||!editId)return;var i=-1;DIR.forEach(function(x,k){if(x.id===editId)i=k});var rec=DIR[i];DIR.splice(i,1);persist();$('#editModal').classList.remove('open');refreshAll();if(boardId)openBoard(boardId);toast('Seat deleted',function(){DIR.splice(i,0,rec);persist();refreshAll()})};
$('#emSave').onclick=function(){if(!isAdmin){toast('Administrator access is required.');return}var role=$('#emRole').value.trim();if(!role){toast('A role is required');return}
var name=$('#emName').value.trim();
var data={name:name,role:role,chapter:$('#emChapter').value,status:name?$('#emStatus').value:'seat',email:$('#emEmail').value.trim(),phone:$('#emPhone').value.trim(),bio:$('#emBio').value.trim(),resp:$('#emResp').value.split('\n').map(function(s){return s.trim()}).filter(Boolean),photo:editPhoto};
if(editId){Object.assign(findExec(editId),data)}else{data.id='n'+Date.now();DIR.push(data)}
persist();$('#editModal').classList.remove('open');refreshAll();if(boardId)openBoard(boardId);toast(editId?'Profile saved':'Seat added')};

function renderFounders(){renderMetrics();var g=$('#fGrid');g.innerHTML='';
FOUND.forEach(function(f){var d=document.createElement('article');d.className='fcard';
d.innerHTML='<div class="ph"'+(canEditFounders()?' data-fph="'+f.id+'"':'')+'>'+(f.photo?'<img src="'+f.photo+'" alt="">':'<span class="ini">'+esc(initials(f.name||f.title))+'</span>')+(canEditFounders()?'<span class="cam"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>':'')+'</div><h3>'+esc(f.name||'Seat open')+'</h3><span class="ttl'+(f.name?'':' seat')+'">'+esc(f.title)+'</span>'+(f.bio?'<p>'+esc(f.bio)+'</p>':'')+'<div class="ct">'+(f.email?'<a href="mailto:'+esc(f.email)+'">Email</a>':'')+(f.phone?'<a href="tel:'+esc(f.phone.replace(/\s/g,''))+'">Call</a>':'')+'</div>'+(canEditFounders()?'<div class="ops"><button class="btn btn-soft btn-sm" data-fedit="'+f.id+'">Edit profile</button></div>':'');
g.appendChild(d)});
$$('[data-fph]').forEach(function(ph){ph.onclick=function(){var id=ph.getAttribute('data-fph');var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=function(){processImage(inp.files[0],function(d){var founder=findFounder(id);if(founder)saveFounder(Object.assign({},founder,{photo:d})).then(function(){toast('Photo added')}).catch(function(error){toast(error.message)})})};inp.click()}});
$$('[data-fedit]').forEach(function(b){b.onclick=function(){openFounder(b.getAttribute('data-fedit'))}})}
var fEditId=null,fPhoto=null;
function openFounder(id){if(!canEditFounders())return;fEditId=id;var f=id?findFounder(id):null;fPhoto=f?f.photo:null;
$('#fmTitle').textContent=f?(f.name||f.title):'New founding member';
$('#fmName').value=f?f.name:'';$('#fmRole').value=f?f.title:'';$('#fmEmail').value=f?f.email:'';$('#fmPhone').value=f?f.phone:'';$('#fmBio').value=f?f.bio:'';
renderFmPhoto();$('#fModal').classList.add('open')}
function renderFmPhoto(){$('#fmPhoto').innerHTML=fPhoto?'<img src="'+fPhoto+'" alt="">':'<span class="ini">'+esc(initials($('#fmName').value||'FIN'))+'</span>'}
$('#fmName').addEventListener('input',renderFmPhoto);
$('#fmPhotoInput').addEventListener('change',function(){processImage(this.files[0],function(d){fPhoto=d;renderFmPhoto()});this.value=''});
$('#fmPhotoClear').onclick=function(){fPhoto=null;renderFmPhoto()};
$('#fmCancel').onclick=function(){$('#fModal').classList.remove('open')};
$('#fAdd').onclick=function(){if(canEditFounders())openFounder(null)};
$('#fExport').onclick=function(){dl(new Blob([JSON.stringify(FOUND,null,2)],{type:'application/json'}),'FIN_Founding_Team.json');toast('Founding team exported')};
$('#fmDelete').onclick=function(){if(!canEditFounders()||!fEditId)return;deleteFounder(fEditId).then(function(){$('#fModal').classList.remove('open');toast('Founding record deleted')}).catch(function(error){toast(error.message)})};
$('#fmSave').onclick=function(){if(!canEditFounders())return;var t=$('#fmRole').value.trim();if(!t){toast('A founding title is required');return}
var data={id:fEditId||'f'+Date.now(),name:$('#fmName').value.trim(),title:t,email:$('#fmEmail').value.trim(),phone:$('#fmPhone').value.trim(),bio:$('#fmBio').value.trim(),photo:fPhoto};
saveFounder(data).then(function(){$('#fModal').classList.remove('open');toast('Founding record saved')}).catch(function(error){toast(error.message)})};

var ROLE_KEYS=[['ambassador','Campus Ambassador'],['president','Chapter President'],['vice president','Vice President / Operations Lead'],['operations lead','Vice President / Operations Lead'],['deputy general','Deputy General Secretary'],['deputy secretary','Deputy General Secretary'],['general secretary','General Secretary'],['secretary','General Secretary'],['financial','Financial Secretary & Treasurer'],['treasurer','Financial Secretary & Treasurer'],['public relations','PR & Communications Director'],['communications','PR & Communications Director'],['media','Media Head'],['graphic','Graphic Designer'],['designer','Graphic Designer'],['program','Programs & Training Coordinator'],['training','Programs & Training Coordinator'],['patron','Chapter Patron']];
function normRole(s){var l=String(s).toLowerCase();for(var i=0;i<ROLE_KEYS.length;i++)if(l.indexOf(ROLE_KEYS[i][0])>-1)return ROLE_KEYS[i][1];return String(s).trim()}
function matchChapter(line){var l=line.toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim();
for(var i=0;i<CH.length;i++){var c=CH[i],nm=c.name.toLowerCase().replace(/ chapter$/,''),ins=c.inst.toLowerCase();
if(l===nm||l===nm+' chapter'||(l.indexOf(nm)===0&&l.length<nm.length+14))return c.id;
if(ins.length>8&&l.indexOf(ins)>-1)return c.id}
if(/chapter\s*$/i.test(line.trim())&&line.trim().length<70){var n2=line.trim(),id=slug(n2);
for(var j=0;j<CH.length;j++)if(CH[j].name.toLowerCase()===n2.toLowerCase())return CH[j].id;
CH.push({id:id,name:n2,inst:n2.replace(/ chapter$/i,''),city:'',region:'',type:'Other Institution'});
ROLES.forEach(function(r,k){DIR.push({id:'i'+Date.now()+k,name:'',role:r.role,chapter:id,status:'seat',email:'',phone:'',bio:'',resp:r.resp.slice(),photo:null})});return id}return null}
function parseImport(text,defCh){var out=[],cur=defCh||'knust',t=text.trim();
if(t.charAt(0)==='['||t.charAt(0)==='{'){try{var j=JSON.parse(t),a=Array.isArray(j)?j:(j.executives||[]);a.forEach(function(o){out.push({chapter:o.chapter||cur,name:o.name||'',role:normRole(o.role||'Executive'),email:o.email||'',phone:o.phone||'',bio:o.bio||''})});return out}catch{toast('Input is not valid JSON; trying directory text parsing.');}}
text.split(/\r?\n/).forEach(function(raw){var line=raw.trim();if(!line||/^[-=_*•]{3,}$/.test(line))return;
var chId=matchChapter(line);if(chId&&!/[:|]/.test(line)&&line.split(/\s+/).length<=9){cur=chId;return}
var email=(line.match(/[\w.+-]+@[\w-]+\.[\w.]+/)||[''])[0];var phone=(line.match(/(\+?233|0)\d[\d\s-]{7,12}\d/)||[''])[0];
var parts=line.replace(email,'').replace(phone,'').split(/\s*[|,;\t]\s*|\s+[—–-]\s+|:\s*/).map(function(s){return s.replace(/^[\s•\-*\d.]+/,'').trim()}).filter(Boolean);
if(parts.length<2){if(parts.length===1&&parts[0].split(/\s+/).length>=2&&parts[0].length<48)out.push({chapter:cur,name:parts[0],role:'Executive Member',email:email,phone:phone,bio:''});return}
var ri=-1;for(var i=0;i<parts.length;i++){var l=parts[i].toLowerCase();for(var k=0;k<ROLE_KEYS.length;k++){if(l.indexOf(ROLE_KEYS[k][0])>-1){ri=i;break}}if(ri>-1)break}
var role,name;if(ri>-1){role=normRole(parts[ri]);name=parts.filter(function(_,i){return i!==ri}).join(' ').trim()}else{role=normRole(parts[1]);name=parts[0]}
if(!name||name.length>60)return;if(/^(name|role|chapter)$/i.test(name))return;
out.push({chapter:cur,name:name,role:role,email:email,phone:phone,bio:''})});return out}
var parsed=null;
function doPreview(){var txt=$('#impText').value;if(!txt.trim()){$('#impPrev').textContent='Paste some text first.';parsed=null;return}
var bD=DIR.slice(),bC=CH.slice();parsed=parseImport(txt,$('#impChapter').value);var chs={};parsed.forEach(function(p){chs[p.chapter]=1});
$('#impPrev').innerHTML='<b>'+parsed.length+'</b> records across <b>'+Object.keys(chs).length+'</b> chapters.<br><br>'+parsed.slice(0,12).map(function(p){return esc(chapter(p.chapter).name)+' → <b>'+esc(p.name)+'</b> · '+esc(p.role)}).join('<br>')+(parsed.length>12?'<br>…and '+(parsed.length-12)+' more':'');
if(!parsed.length){DIR=bD;CH=bC}}
$('#impPreview').onclick=doPreview;
function openImport(){if(!isAdmin)return;fillChapters('#impChapter','knust');$('#impPrev').textContent='Nothing parsed yet.';parsed=null;$('#importModal').classList.add('open')}
$('#chImport').onclick=openImport;$('#heroImport').onclick=openImport;
$('#impCancel').onclick=function(){$('#importModal').classList.remove('open')};
$('#impApply').onclick=function(){if(!isAdmin){toast('Administrator access is required.');return}if(!parsed)doPreview();if(!parsed||!parsed.length){toast('Nothing to import — check the format');return}
if($('#impMode').value==='replace'){DIR=buildSeats();CH.forEach(function(c){if(!DIR.some(function(e){return e.chapter===c.id}))ROLES.forEach(function(r,i){DIR.push({id:'r'+Date.now()+i+c.id,name:'',role:r.role,chapter:c.id,status:'seat',email:'',phone:'',bio:'',resp:r.resp.slice(),photo:null})})})}
var filled=0,added=0;
parsed.forEach(function(p){var slot=null,i;
for(i=0;i<DIR.length;i++)if(DIR[i].chapter===p.chapter&&DIR[i].role===p.role&&!DIR[i].name){slot=DIR[i];break}
if(!slot)for(i=0;i<DIR.length;i++)if(DIR[i].chapter===p.chapter&&DIR[i].role===p.role){slot=DIR[i];break}
if(slot){slot.name=p.name;slot.status='active';if(p.email)slot.email=p.email;if(p.phone)slot.phone=p.phone;if(p.bio)slot.bio=p.bio;filled++}
else{DIR.push({id:'p'+Date.now()+added,name:p.name,role:p.role,chapter:p.chapter,status:'active',email:p.email,phone:p.phone,bio:p.bio,resp:[],photo:null});added++}});
persist();$('#importModal').classList.remove('open');refreshAll();toast('Imported: '+filled+' filled, '+added+' added')};

/* ===== BLUEPRINT ===== */
var MP='<g fill="#F5B927"><path d="M100 4 L105 26 L95 26 Z"/><path d="M134 10 L130 32 L139 29 Z"/><path d="M162 26 L149 42 L156 47 Z"/><path d="M178 52 L158 58 L160 66 Z"/><path d="M66 10 L70 32 L61 29 Z"/><path d="M38 26 L51 42 L44 47 Z"/><path d="M22 52 L42 58 L40 66 Z"/></g><path d="M100 24 C124 24 141 40 145 62 L100 62 Z" fill="#F5B927"/><path d="M100 24 C76 24 59 40 55 62 L100 62 Z" fill="#F5B927"/><g fill="none" stroke="#F5B927" stroke-width="7" stroke-linejoin="round"><path d="M100 50 L178 82 L100 114 L22 82 Z"/><path d="M48 94 L48 118 C48 126 62 132 78 135"/><path d="M152 94 L152 118 C152 126 138 132 122 135"/><path d="M72 138 L100 150 L128 138"/><path d="M62 150 L100 166 L138 150"/></g><path d="M178 82 L178 112" stroke="#F5B927" stroke-width="4" fill="none"/><circle cx="178" cy="117" r="5" fill="#F5B927"/><path d="M178 121 L172 140 L184 140 Z" fill="#F5B927"/><path d="M122 30 L110 80 L98 73 Z" fill="#F5B927"/><path d="M98 73 L110 80 L116 114 L104 88 L78 112 Z" fill="#0A3161"/><circle cx="105" cy="78" r="7.5" fill="#F5B927"/>';
var S='<svg xmlns="http://www.w3.org/2000/svg" ',ART={};
ART.mark=S+'viewBox="0 0 200 170">'+MP+'</svg>';
ART.member=S+'viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice"><rect width="600" height="700" fill="#E8E4DA"/><rect width="600" height="470" fill="#DDD8CC"/><rect x="30" y="10" width="170" height="250" fill="#0A3161"/><g transform="translate(63,26) scale(0.52)">'+MP+'</g><text x="115" y="140" text-anchor="middle" font-family="Arial" font-weight="900" font-size="24" fill="#fff">FORTUNE</text><text x="115" y="162" text-anchor="middle" font-family="Arial" font-weight="900" font-size="15" fill="#F5B927">INTERN</text><g font-family="Arial" font-weight="800" font-size="17" fill="#fff"><text x="115" y="196" text-anchor="middle">BRIDGING</text><text x="115" y="218" text-anchor="middle">DREAMS AND</text><text x="115" y="240" text-anchor="middle" fill="#F5B927">CAREERS</text></g><circle cx="300" cy="96" r="40" fill="#241A12"/><circle cx="262" cy="128" r="38" fill="#241A12"/><circle cx="338" cy="128" r="38" fill="#241A12"/><circle cx="300" cy="180" r="56" fill="#8D5524"/><circle cx="282" cy="172" r="5" fill="#241A12"/><circle cx="318" cy="172" r="5" fill="#241A12"/><path d="M278 200q22 20 44 0v8q-22 18-44 0z" fill="#fff"/><path d="M180 700V430c0-70 50-110 120-110s120 40 120 110v270z" fill="#17181C"/><g transform="translate(238,404) rotate(-4)"><rect width="170" height="220" rx="10" fill="#0A3161"/><g transform="translate(35,26) scale(0.5)">'+MP+'</g><text x="85" y="152" text-anchor="middle" font-family="Arial" font-weight="900" font-size="24" fill="#fff">FORTUNE</text><text x="85" y="176" text-anchor="middle" font-family="Arial" font-weight="900" font-size="15" fill="#F5B927">INTERN</text></g></svg>';
ART.speak=S+'viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice"><rect width="800" height="1000" fill="#B7B3A4"/><rect x="210" y="160" width="350" height="440" rx="10" fill="#E3E6E9"/><circle cx="400" cy="330" r="58" fill="#6B4A2F"/><path d="M342 322a58 58 0 0 1 116 0c-14-26-30-36-58-36s-44 10-58 36z" fill="#191209"/><path d="M250 1000V640c0-120 60-190 150-190s150 70 150 190v360z" fill="#12365E"/><rect x="392" y="470" width="26" height="90" rx="13" fill="#15181D"/><circle cx="405" cy="462" r="26" fill="#2A2E35"/><rect x="80" y="480" width="160" height="64" rx="32" fill="#F5B927"/><text x="160" y="526" text-anchor="middle" font-family="Arial" font-weight="900" font-size="40" fill="#0A3161">TWO</text><g font-family="Arial" font-weight="900" font-size="76"><text x="80" y="620" fill="#fff">PUBLIC SPEAKING</text><text x="80" y="700" fill="#fff">IMPROVES</text><text x="80" y="780" fill="#F2B84B">COMMUNICATION</text><text x="80" y="860" fill="#fff">SKILLS</text></g><text x="780" y="42" text-anchor="end" font-family="Arial" font-weight="900" font-size="30" fill="#fff">FORTUNE MENTORSHIP INFO</text></svg>';
ART.skill=S+'viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice"><rect width="800" height="1000" fill="#D8D4C8"/><g transform="translate(560,16) scale(0.62)">'+MP+'</g><text x="660" y="152" text-anchor="middle" font-family="Arial" font-weight="900" font-size="34" fill="#0A3161">FORTUNE</text><rect x="70" y="210" width="660" height="330" rx="26" fill="#F2F2F0" stroke="#0F172A" stroke-width="3"/><rect x="240" y="240" width="220" height="70" rx="16" fill="#F0862F"/><text x="350" y="288" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="40" fill="#fff">Invest in</text><text x="400" y="470" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="150" fill="#0A3161">Skill</text><rect y="560" width="800" height="440" rx="30" fill="#6A7A63" stroke="#0A3161" stroke-width="10"/><rect x="130" y="505" width="470" height="70" rx="16" fill="#F0862F"/><text x="365" y="552" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="#fff">We Will Help You Learn;</text><g font-family="Arial" font-weight="700" font-size="40" fill="#fff"><text x="180" y="666">Graphic Design</text><text x="180" y="726">Public Speaking</text><text x="180" y="786">Business Pitching</text><text x="180" y="846">Entrepreneurship</text><text x="180" y="906">Project Execution</text><text x="180" y="966">Strategic Networking</text></g></svg>';
ART.tee=S+'viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice"><rect width="800" height="1000" fill="#000"/><path d="M400 90c-40 0-70 12-90 30L60 210l60 120 70-30v560h420V300l70 30 60-120-250-90c-20-18-50-30-90-30z" fill="#F4F4F4"/><g transform="translate(474,224) scale(0.34)">'+MP+'</g><rect x="270" y="360" width="260" height="180" rx="46" fill="#F5B927" stroke="#C89A3C" stroke-width="6"/><g font-family="Arial" font-weight="900" fill="#0A3161" text-anchor="middle"><text x="400" y="452" font-size="64">FORT</text><text x="400" y="516" font-size="64">UNE</text><text x="400" y="592" font-size="40">INTERN</text></g><g><path d="M240 960l40-80 40 80z" fill="#0A3161"/><path d="M320 960l40-80 40 80z" fill="#C89A3C"/><path d="M400 960l40-80 40 80z" fill="#0A3161"/><path d="M480 960l40-80 40 80z" fill="#C89A3C"/><path d="M560 960l40-80 40 80z" fill="#0A3161"/></g></svg>';
var META={member:{n:'Member Kit Visual',vb:[600,700]},speak:{n:'Public Speaking Poster',vb:[800,1000]},skill:{n:'Skills Poster',vb:[800,1000]},tee:{n:'T Shirt Mockup',vb:[800,1000]}};
var SLOTS=[{k:'member',pg:2,n:'Member kit visual'},{k:'speak',pg:8,n:'Public speaking poster'},{k:'skill',pg:10,n:'Skills bootcamp poster'},{k:'tee',pg:15,n:'T shirt mockup'}];
var BP=loadLS('fin_bp_v6',{});
var slides=$$('#bpStage .slide'),TOTAL=slides.length,bpCur=0;
$$('.art[data-art]').forEach(function(d){d.innerHTML=ART[d.getAttribute('data-art')]});
slides.forEach(function(sl,i){sl.insertAdjacentHTML('afterbegin','<div class="wm">'+ART.mark+'</div><header class="s-head"><span class="s-logo">'+ART.mark+'<em>FORTUNE<b>INTERN NETWORK</b></em></span><span class="s-kick">'+(sl.getAttribute('data-kick')||'')+'</span></header>');
sl.insertAdjacentHTML('beforeend','<footer class="s-foot"><span>Fortune Intern Network · Bridging Dreams and Careers</span><span>Page '+(i+1)+' of '+TOTAL+'</span></footer>')});
function bpShow(i){bpCur=Math.max(0,Math.min(TOTAL-1,i));slides.forEach(function(s,k){s.classList.toggle('active',k===bpCur)});
$('#bpCnt').textContent=(bpCur+1)+' / '+TOTAL;$('#bpProg').style.width=(((bpCur+1)/TOTAL)*100)+'%';
$('#bpPrev').disabled=bpCur===0;$('#bpNext').disabled=bpCur===TOTAL-1;var b=slides[bpCur].querySelector('.s-body');if(b)b.scrollTop=0}
$('#bpPrev').onclick=function(){bpShow(bpCur-1)};$('#bpNext').onclick=function(){bpShow(bpCur+1)};bpShow(0);
function bpApply(k,d){BP[k]=d;saveLS('fin_bp_v6',BP);var a=$('.art[data-art="'+k+'"]'),p=a.closest('.poster');var im=a.querySelector('img.rep');if(!im){im=document.createElement('img');im.className='rep';a.appendChild(im)}im.src=d;p.classList.add('has-rep');bpRenderInsert()}
function bpRevert(k){delete BP[k];saveLS('fin_bp_v6',BP);var a=$('.art[data-art="'+k+'"]'),p=a.closest('.poster');var im=a.querySelector('img.rep');if(im)im.remove();p.classList.remove('has-rep');bpRenderInsert()}
function bpRenderInsert(){var l=$('#bpInsertList');l.innerHTML='';SLOTS.forEach(function(s){var r=document.createElement('div');r.className='arow';r.innerHTML='<span class="th">'+(BP[s.k]?'<img src="'+BP[s.k]+'">':ART[s.k])+'</span><span class="nm"><b>'+s.n+'</b><span>Page '+s.pg+'</span></span><span class="acts"><label>Choose<input type="file" accept="image/*" data-bpk="'+s.k+'"></label><button class="rev" data-bprev="'+s.k+'">Revert</button></span>';l.appendChild(r)})}
$('#bpInsertList').addEventListener('change',function(e){var i=e.target.closest('input[data-bpk]');if(!i)return;processImage(i.files[0],function(d){bpApply(i.getAttribute('data-bpk'),d);toast('Photo inserted')});i.value=''});
$('#bpInsertList').addEventListener('click',function(e){var b=e.target.closest('[data-bprev]');if(b){bpRevert(b.getAttribute('data-bprev'));toast('Artwork restored')}});
$('#tInsert').onclick=function(){bpRenderInsert();$('#bpInsertModal').classList.add('open')};
$('#bpInsertClose').onclick=function(){$('#bpInsertModal').classList.remove('open')};
Object.keys(BP).forEach(function(k){if(ART[k])bpApply(k,BP[k])});
function strB(s){var u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u}
function b64B(b){var x=atob(b),u=new Uint8Array(x.length);for(var i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u}
var CT=(function(){var t=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
function crc(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function buildPDF(pg){var N=pg.length,W=841.89,H=595.28,o=[],i;o[1]='1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
var k=[];for(i=0;i<N;i++)k.push((3+i*3)+' 0 R');o[2]='2 0 obj\n<< /Type /Pages /Kids ['+k.join(' ')+'] /Count '+N+' >>\nendobj\n';
for(i=0;i<N;i++){var p=3+i*3,c=4+i*3,m=5+i*3;o[p]=p+' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /XObject << /Im'+i+' '+m+' 0 R >> /ProcSet [/PDF /ImageC] >> /Contents '+c+' 0 R >>\nendobj\n';
var s='q '+W+' 0 0 '+H+' 0 0 cm /Im'+i+' Do Q';o[c]={a:c+' 0 obj\n<< /Length '+s.length+' >>\nstream\n',b:strB(s),c:'\nendstream\nendobj\n'};
o[m]={a:m+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+pg[i].w+' /Height '+pg[i].h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+pg[i].b.length+' >>\nstream\n',b:pg[i].b,c:'\nendstream\nendobj\n'}}
var ch=[strB('%PDF-1.4\n')],off=[10],len=10,tot=3+3*N;
for(i=1;i<tot;i++){off[i]=len;var x=o[i];if(typeof x==='string'){var b=strB(x);ch.push(b);len+=b.length}else{var a1=strB(x.a),a3=strB(x.c);ch.push(a1,x.b,a3);len+=a1.length+x.b.length+a3.length}}
var xr=len,s2='xref\n0 '+tot+'\n0000000000 65535 f \n';for(i=1;i<tot;i++)s2+=('0000000000'+off[i]).slice(-10)+' 00000 n \n';
s2+='trailer\n<< /Size '+tot+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';ch.push(strB(s2));return new Blob(ch,{type:'application/pdf'})}
function zip(fs){var ch=[],off=0,ce=[],t=0x8623,d=0x52A6;
fs.forEach(function(f){var nb=strB(f.name),dd=f.data,c=crc(dd);var lh=new Uint8Array(30+nb.length),v=new DataView(lh.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(8,0,true);v.setUint16(10,t,true);v.setUint16(12,d,true);v.setUint32(14,c,true);v.setUint32(18,dd.length,true);v.setUint32(22,dd.length,true);v.setUint16(26,nb.length,true);lh.set(nb,30);ch.push(lh,dd);ce.push({n:nb,c:c,s:dd.length,o:off});off+=lh.length+dd.length});
var cs=off,cz=0;ce.forEach(function(c){var h=new Uint8Array(46+c.n.length),v=new DataView(h.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(12,t,true);v.setUint16(14,d,true);v.setUint32(16,c.c,true);v.setUint32(20,c.s,true);v.setUint32(24,c.s,true);v.setUint16(28,c.n.length,true);v.setUint32(42,c.o,true);h.set(c.n,46);ch.push(h);cz+=h.length});
var e=new Uint8Array(22),v2=new DataView(e.buffer);v2.setUint32(0,0x06054b50,true);v2.setUint16(8,fs.length,true);v2.setUint16(10,fs.length,true);v2.setUint32(12,cz,true);v2.setUint32(16,cs,true);ch.push(e);
return new Blob(ch,{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'})}
function buildPPTX(pg){var N=pg.length,CX=10692000,CY=7560000,i,f=[];
var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>';
for(i=1;i<=N;i++)ct+='<Override PartName="/ppt/slides/slide'+i+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';ct+='</Types>';
f.push({name:'[Content_Types].xml',data:strB(ct)});
f.push({name:'_rels/.rels',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>')});
var pr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>';
for(i=1;i<=N;i++)pr+='<p:sldId id="'+(255+i)+'" r:id="rId'+(i+1)+'"/>';pr+='</p:sldIdLst><p:sldSz cx="'+CX+'" cy="'+CY+'"/><p:notesSz cx="'+CY+'" cy="'+CX+'"/></p:presentation>';
f.push({name:'ppt/presentation.xml',data:strB(pr)});
var pl='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>';
for(i=1;i<=N;i++)pl+='<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'+i+'.xml"/>';pl+='</Relationships>';
f.push({name:'ppt/_rels/presentation.xml.rels',data:strB(pl)});
f.push({name:'ppt/slideMasters/slideMaster1.xml',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>')});
f.push({name:'ppt/slideMasters/_rels/slideMaster1.xml.rels',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>')});
f.push({name:'ppt/slideLayouts/slideLayout1.xml',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>')});
f.push({name:'ppt/slideLayouts/_rels/slideLayout1.xml.rels',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>')});
f.push({name:'ppt/theme/theme1.xml',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="FIN"><a:themeElements><a:clrScheme name="FIN"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0A3161"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="F5B927"/></a:accent1><a:accent2><a:srgbClr val="0F9D6E"/></a:accent2><a:accent3><a:srgbClr val="12365E"/></a:accent3><a:accent4><a:srgbClr val="C89A3C"/></a:accent4><a:accent5><a:srgbClr val="475569"/></a:accent5><a:accent6><a:srgbClr val="E2E8F0"/></a:accent6><a:hlink><a:srgbClr val="0A3161"/></a:hlink><a:folHlink><a:srgbClr val="475569"/></a:folHlink></a:clrScheme><a:fontScheme name="FIN"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FIN"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>')});
for(i=1;i<=N;i++){f.push({name:'ppt/slides/slide'+i+'.xml',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Page '+i+'"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+CX+'" cy="'+CY+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>')});
f.push({name:'ppt/slides/_rels/slide'+i+'.xml.rels',data:strB('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image'+i+'.jpeg"/></Relationships>')});
f.push({name:'ppt/media/image'+i+'.jpeg',data:pg[i-1].b})}
return zip(f)}
var H2C=['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'];
function lsc(u){return new Promise(function(r,j){var s=document.createElement('script');s.src=u;s.onload=r;s.onerror=function(){j()};document.head.appendChild(s)})}
function ensure(){if(window.html2canvas)return Promise.resolve();var p=Promise.reject();H2C.forEach(function(u){p=p.catch(function(){return lsc(u)})});return p.then(function(){if(!window.html2canvas)throw 0})}
function capture(){var st=$('#bpStage'),ow=st.style.width,oh=st.style.height,pv=bpCur,out=[];
st.style.width='1122px';st.style.height='794px';document.body.style.overflow='visible';var p=Promise.resolve();
for(var i=0;i<TOTAL;i++){(function(i){p=p.then(function(){bpShow(i);return new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})})}).then(function(){toast('Rendering page '+(i+1)+' of '+TOTAL);return window.html2canvas(slides[i],{scale:2,backgroundColor:'#F8FAFC',useCORS:true,logging:false})}).then(function(c){out.push({w:c.width,h:c.height,b:b64B(c.toDataURL('image/jpeg',0.92).split(',')[1])});c.width=0;c.height=0})})(i)}
return p.then(function(){st.style.width=ow;st.style.height=oh;document.body.style.overflow='';bpShow(pv);return out})}
var busy=false;function sb(v){busy=v;['tPdf','tPptx','tDeck','tInsert','tPrint'].forEach(function(id){var b=document.getElementById(id);if(b)b.disabled=v})}
$('#tPdf').onclick=function(){if(busy)return;setTab('blueprint');sb(true);toast('Preparing PDF…');ensure().then(capture).then(function(p){dl(buildPDF(p),'FIN_Campus_Blueprint_SOP.pdf');toast('PDF downloaded — '+p.length+' pages');sb(false)}).catch(function(){sb(false);toast('Opening Print — choose Save as PDF');setTimeout(function(){window.print()},500)})};
$('#tPptx').onclick=function(){if(busy)return;setTab('blueprint');sb(true);toast('Preparing PowerPoint…');ensure().then(capture).then(function(p){dl(buildPPTX(p),'FIN_Campus_Blueprint_SOP.pptx');toast('PowerPoint downloaded — '+p.length+' slides');sb(false)}).catch(function(){sb(false);toast('PowerPoint needs the renderer once — check connection')})};
$('#tPrint').onclick=function(){setTab('blueprint');setTimeout(function(){window.print()},150)};
$('#tDeck').onclick=function(){dl(new Blob(['<!DOCTYPE html>\n'+document.documentElement.outerHTML],{type:'text/html'}),'FIN_Chapters_Blueprint.html');toast('Page downloaded — photos travel with it')};
function renderAssets(){var l=$('#assetsList');l.innerHTML='';Object.keys(META).forEach(function(k){var r=document.createElement('div');r.className='arow';r.innerHTML='<span class="th">'+ART[k]+'</span><span class="nm"><b>'+META[k].n+'</b><span>Original artwork</span></span><span class="acts"><button data-asvg="'+k+'">SVG</button><button data-apng="'+k+'">PNG</button></span>';l.appendChild(r)})}
$('#assetsList').addEventListener('click',function(e){var s=e.target.closest('[data-asvg]'),p=e.target.closest('[data-apng]');
if(s)dl(new Blob([ART[s.getAttribute('data-asvg')]],{type:'image/svg+xml'}),'FIN_'+s.getAttribute('data-asvg')+'.svg');
if(p){var k=p.getAttribute('data-apng'),vb=META[k].vb;var str=ART[k].replace('<svg ','<svg width="'+vb[0]+'" height="'+vb[1]+'" ');var im=new Image();im.onload=function(){var c=document.createElement('canvas');c.width=vb[0]*2;c.height=vb[1]*2;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);c.toBlob(function(b){dl(b,'FIN_'+k+'.png')},'image/png')};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(str)}});
$('#tAssets').onclick=function(){renderAssets();$('#assetsModal').classList.add('open')};
$('#assetsClose').onclick=function(){$('#assetsModal').classList.remove('open')};

$$('.copy').forEach(function(b){b.addEventListener('click',function(){var txt=document.getElementById(b.getAttribute('data-copy')).innerText;
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(function(){toast('Copied to clipboard')},function(){fb(txt)});else fb(txt);
function fb(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('Copied to clipboard')}catch{toast('Copy failed — select manually')}ta.remove()}})});
document.addEventListener('keydown',function(e){
if(e.key==='Escape'){$$('.modal.open').forEach(function(m){m.classList.remove('open')});closeBoard();return}
if(currentTab!=='blueprint')return;
if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();bpShow(bpCur+1)}
else if(e.key==='ArrowLeft'){e.preventDefault();bpShow(bpCur-1)}
else if(e.key==='p'||e.key==='P')window.print()});
var x0=null;
document.addEventListener('touchstart',function(e){if(currentTab==='blueprint')x0=e.touches[0].clientX},{passive:true});
document.addEventListener('touchend',function(e){if(currentTab!=='blueprint'||x0===null)return;var d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)bpShow(bpCur+(d<0?1:-1));x0=null},{passive:true});
function refreshAll(){renderMetrics();renderChapters();renderFounders()}
refreshAll();
verifySession();
loadFounders();
})();
