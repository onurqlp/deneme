/* AYDA site integrity checks — no external dependencies */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html');
const panel=read('panel.html');
const css=read('experience.css');
const script=read('experience.js');
const legacy=read('script.js');
const faq=home.includes('id="sorular"');
const count=(s,re)=>(s.match(re)||[]).length;
const ids=Array.from(home.matchAll(/\bid="([^"]+)"/g),match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs detected');
for(const name of ['hero-title','basla','deneyim','demo','guven','programlar','sorular','kayit','ex-quiz-working','ex-panel-frame','ex-course-title']){
 assert(ids.includes(name),'Missing essential section/control: '+name);
}
for(const fragment of Array.from(home.matchAll(/\bhref="#([^"]+)"/g),m=>m[1])){
 assert(ids.includes(fragment),'Unresolved internal link: #'+fragment);
}
assert.equal(count(home,/<main\b/g),1,'Expected one main');
assert.equal(count(home,/<footer\b/g),1,'Expected one footer');
assert.equal(count(home,/class="ex-quickbar"/g),1,'Expected one mobile CTA');
assert.equal(count(home,/<section\b/g),count(home,/<\/section>/g),'Unbalanced sections');
assert(home.includes('experience.css')&&home.includes('experience.js'),'Missing modern assets');
assert(!home.includes('href="style.css"'),'Legacy styles must stay isolated from landing');
assert(panel.includes('src="script.js')&&panel.includes('href="style.css'),'Legacy student panel assets must remain linked');
assert(panel.includes('id="app-practice"')&&panel.includes('id="app-exam"'),'Student experience incomplete');
assert(home.includes('hBnZy7tWF-A'),'Missing sourced instructor video');
assert(home.includes('ex-testimonial'),'Missing sourced review');
assert(home.includes('favicon.svg'),'Missing favicon');
new vm.Script(script,{filename:'experience.js'});
new vm.Script(legacy,{filename:'script.js'});
let depth=0;
for(const ch of css){if(ch==='{')depth++; if(ch==='}')depth--; assert(depth>=0,'Unbalanced CSS braces')}
assert.equal(depth,0,'Unbalanced CSS braces');
const refs=Array.from(script.matchAll(/\$\('#(ex-[a-z0-9-]+)'\)/g),m=>m[1]);
for(const ref of refs) assert(ids.includes(ref),'Dangling script HTML ID: '+ref);
console.log('PASS | AYDA experience HTML, CSS, JavaScript and panel integrity');
