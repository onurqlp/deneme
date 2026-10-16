/**
 * COIN.LIVE signal logger (Google Apps Script).
 * Bound to COIN.LIVE Trading Intelligence Google Sheet.
 * Run installCoinLive() once, authorize, then the script polls public GitHub Pages JSON.
 * No API keys, no trading execution. 5-minute time-driven trigger.
 */
const COIN={url:"https://onurqlp.github.io/deneme/coin-live/signals-snapshot.json",sheet:"SINYALLER"};
function installCoinLive(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 if(!ss.getSheetByName(COIN.sheet))throw Error("SINYALLER sheet missing");
 ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==="syncCoinLive").forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger("syncCoinLive").timeBased().everyMinutes(5).create();
 syncCoinLive();
}
function syncCoinLive(){
 const ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(COIN.sheet);
 const lock=LockService.getScriptLock();if(!lock.tryLock(20000))return;
 try{
  const response=UrlFetchApp.fetch(COIN.url+"?t="+Date.now(),{muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw Error("Signals HTTP "+response.getResponseCode());
  const data=JSON.parse(response.getContentText());
  if(!Array.isArray(data.signals)||!data.provider||!data.fetched_at)throw Error("Invalid signal data");
  const stamp=Date.parse(data.fetched_at);
  if(!Number.isFinite(stamp)||Math.abs(Date.now()-stamp)>20*60000)throw Error("Signal snapshot is stale");
  const last=sh.getLastRow();
  const existing=new Set(last>1?sh.getRange(2,1,last-1,1).getValues().flat().filter(Boolean):[]);
  const added=[];
  for(const s of data.signals){
   if(!["AL","SAT"].includes(s.signal)||!Number.isFinite(Number(s.entry))||!Number.isFinite(Number(s.stop))||!Array.isArray(s.targets)||s.targets.length!==3)continue;
   if(!s.analysis_time||Math.abs(Date.parse(s.analysis_time)-stamp)>20*60000)continue;
   const t=new Date(s.analysis_time);
   // Stable 15m signal identity, prevents duplicate writes across 5-minute polling.
   const candle=Math.floor(t.getTime()/900000)*900000;
   const id=[data.provider,s.symbol,s.signal,candle].join("|");
   if(existing.has(id))continue;
   existing.add(id);
   added.push([id,s.analysis_time,data.provider,s.symbol,s.signal,Number(s.entry),Number(s.stop),...s.targets.map(Number),Number(s.score)||0,
    Math.abs((Number(s.entry)-Number(s.stop))/Number(s.entry))*100,"ACIK","","","","","","Kapanmış mum sinyali; sonuç henüz değerlendirilmedi"]);
  }
  if(added.length)sh.getRange(sh.getLastRow()+1,1,added.length,19).setValues(added);
  ss.getSheetByName("AYARLAR").getRange("A2:C4").setValues([
   ["Son başarılı senkronizasyon",new Date(),"Google Apps Script"],
   ["Kaynak",data.provider,"Kaynak ve OHLC aynı borsa olmalı"],
   ["Yeni sinyal",added.length,"Sadece AL/SAT kaydı; BEKLE kaydedilmez"]]);
  SpreadsheetApp.flush();
 }finally{lock.releaseLock();}
}
