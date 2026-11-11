const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
 const server=process.env.URL?null:spawn('python3',['-m','http.server','8840','--bind','127.0.0.1'],{cwd:require('node:path').resolve(__dirname,'../dist'),stdio:'ignore'});
 const browser=await chromium.launch();
 try {
  if(server)await new Promise(r=>setTimeout(r,300));
  for(const reducedMotion of ['reduce','no-preference']) {
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion});
   await context.addInitScript(()=>{
    window.audioContexts=[];const Original=window.AudioContext;
    window.AudioContext=class extends Original{constructor(...args){super(...args);window.audioContexts.push(this);}};
   });
   const page=await context.newPage(),errors=[],media=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(/\.mp3/.test(r.url()))media.push(r.url());});
   await page.goto(process.env.URL||'http://127.0.0.1:8840',{waitUntil:'networkidle'});
   assert.equal(await page.evaluate(()=>window.audioContexts.length),0);
   assert.equal(await page.locator('#playPauseBtn').getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('#trackInfo').innerText(),'Garden water');
   for(const title of ['Garden water','Wind in bamboo','Temple courtyard']) {
    assert.equal(await page.locator('#trackInfo').innerText(),title);
    await page.getByRole('button',{name:'Play ambience',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#playPauseBtn').getAttribute('aria-pressed')==='true');
    assert.equal(await page.evaluate(()=>window.audioContexts.at(-1).state),'running');
    await page.locator('#volumeSlider').fill('0.25');
    await page.getByRole('button',{name:'Mute ambience',exact:true}).click();
    await page.waitForFunction(()=>window.audioContexts.every(c=>c.state==='closed'));
    await page.getByRole('button',{name:'Next place',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#nextBtn').disabled);
   }
   // A live place switch closes the previous context and starts the selected ambience.
   await page.getByRole('button',{name:'Play ambience',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('#playPauseBtn').disabled);
   await page.getByRole('button',{name:'Next place',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('#nextBtn').disabled);
   assert.equal(await page.locator('#trackInfo').innerText(),'Wind in bamboo');
   assert.equal(await page.evaluate(()=>window.audioContexts.filter(c=>c.state==='running').length),1);
   await page.getByRole('button',{name:'Mute ambience',exact:true}).click();
   await page.waitForFunction(()=>window.audioContexts.every(c=>c.state==='closed'));
   assert.equal(await page.locator('#soundError').innerText(),'');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);assert.deepEqual(media,[]);
   await page.screenshot({path:(process.env.PIXELS||'/downloads')+'/zen-ambience-'+reducedMotion+'-390.png'});
   console.log('PASS',reducedMotion,'all places, opt-in/mute, context cleanup, live switching, no MP3 requests or JS errors');
   await context.close();
  }
 }finally{await browser.close();server?.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
