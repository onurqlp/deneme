import fs from "node:fs";
import assert from "node:assert/strict";
const path=new URL("./",import.meta.url);
const html=fs.readFileSync(new URL("index.html",path),"utf8");
const js=fs.readFileSync(new URL("board.js",path),"utf8");
const css=fs.readFileSync(new URL("board.css",path),"utf8");
const edge=fs.readFileSync(new URL("edge.js",path),"utf8");
new Function(edge);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,"Duplicate element IDs");
new Function(js);
const set=new Set(ids),used=[...js.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
const missing=[...new Set(used)].filter(x=>!set.has(x));
assert.deepEqual(missing,[],"Missing board DOM IDs: "+missing.join(", "));
const edgeUsed=[...edge.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
assert.deepEqual([...new Set(edgeUsed)].filter(x=>!set.has(x)),[],"Missing EDGE DOM elements");
for(const id of ["connection","count","activeSignals","updated","sourceName","verdictHeadline","levels","riskBreakdown","topCandidates","earlyWatch","newsList","rows","chart","calculatorModal","balanceInput","soundButton","notificationButton"]){
 assert.ok(set.has(id),"Missing required dashboard control: "+id);
}
assert.ok(html.includes('board.js?')&&html.includes('board.css?')&&html.includes('edge.js?'),"Board/early-edge assets not referenced");
for(const id of ["healthStrip","healthTitle","healthDetails","edgeHeadline","edgeStatus","edgeCandidates","edgeAlertLog"])assert.ok(set.has(id),"Missing early-warning interface: "+id);
assert.ok(js.includes('localSignals:new Map()'),"Browser-produced signals need isolated freshness gates");
assert.ok(edge.includes('candleSnapshot')&&edge.includes('15m')&&edge.includes('1h')&&edge.includes('4h'),"Cross-timeframe real candle confirmation missing");
assert.ok(edge.includes('priceHistory')&&edge.includes('.6'),"Micro-move radar missing");
assert.ok(js.includes("perTrade/(stopDist+friction)"),"Fee-aware capital risk cap absent");
assert.ok(css.length>3000,"Board stylesheet incomplete");
for(const text of ["market-snapshot.json","signals-snapshot.json","api.hyperliquid.xyz","market/tickers?instType=SWAP","Notification.permission","role"]){
 if(text!=="role")assert.ok(js.includes(text),"Market/signal feature absent: "+text);
}
assert.ok(!html.includes('id="paperOpen"'),"Paper trading desk must be removed from primary UI");
assert.ok(!html.includes('data-candle='),"Timeframe chooser must be removed");
console.log("PASS: simple UI, DOM references, JS syntax, market quotes, remote signals, live sources, no paper desk or timeframe selector");
