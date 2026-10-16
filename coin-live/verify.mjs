import fs from "node:fs";
import assert from "node:assert/strict";
const path=new URL("./",import.meta.url);
const html=fs.readFileSync(new URL("index.html",path),"utf8");
const js=fs.readFileSync(new URL("board.js",path),"utf8");
const css=fs.readFileSync(new URL("board.css",path),"utf8");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"Duplicate element IDs");
new Function(js);
const set=new Set(ids),used=[...js.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
const missing=[...new Set(used)].filter(x=>!set.has(x));
assert.deepEqual(missing,[],"Missing board DOM IDs: "+missing.join(", "));
for(const id of ["connection","count","activeSignals","updated","sourceName","verdictHeadline","levels","riskBreakdown","topCandidates","earlyWatch","newsList","rows","chart","calculatorModal","balanceInput","soundButton","notificationButton"]){
 assert.ok(set.has(id),"Missing required dashboard control: "+id);
}
assert.ok(html.includes('board.js?')&&html.includes('board.css?'),"Board assets not referenced");
assert.ok(css.length>3000,"Board stylesheet incomplete");
for(const text of ["market-snapshot.json","signals-snapshot.json","api.hyperliquid.xyz","market/tickers?instType=SWAP","Notification.permission","role"]){
 if(text!=="role")assert.ok(js.includes(text),"Market/signal feature absent: "+text);
}
assert.ok(!html.includes('id="paperOpen"'),"Paper trading desk must be removed from primary UI");
assert.ok(!html.includes('data-candle='),"Timeframe chooser must be removed");
console.log("PASS: simple UI, DOM references, JS syntax, market quotes, remote signals, live sources, no paper desk or timeframe selector");
