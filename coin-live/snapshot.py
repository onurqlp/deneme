#!/usr/bin/env python3
"""COIN.LIVE free public market snapshot, no secrets/no trading accounts."""
from __future__ import annotations
import json, urllib.request, urllib.error, re, datetime, pathlib, math, sys, time
BASE=pathlib.Path(__file__).resolve().parent
OUT=BASE/"market-snapshot.json"
TIMEOUT=13
UA="CoinLive-MarketData/1.0 (public market information; GitHub Pages)"
def fetch(url,payload=None):
    body=json.dumps(payload).encode() if payload is not None else None
    req=urllib.request.Request(url,body,headers={"User-Agent":UA,"Accept":"application/json",**({"Content-Type":"application/json"} if payload is not None else {})},method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req,timeout=TIMEOUT) as resp:
        return json.load(resp)
def safe(v):
    try:
        n=float(v)
        return n if math.isfinite(n) else None
    except (ValueError,TypeError): return None
def valid(rows):
    return sorted([x for x in rows if (x.get("price") or 0)>0 and (x.get("volume") or 0)>0 and (x.get("symbol") or "").endswith("USDT")],key=lambda a:a["volume"],reverse=True)[:100]
def binance():
    raw=fetch("https://fapi.binance.com/fapi/v1/ticker/24hr")
    info=fetch("https://fapi.binance.com/fapi/v1/exchangeInfo")
    names={x["symbol"] for x in info["symbols"] if x.get("quoteAsset")=="USDT" and x.get("contractType")=="PERPETUAL" and x.get("status")=="TRADING"}
    r=valid([{"symbol":x["symbol"],"price":safe(x.get("lastPrice")),"change":safe(x.get("priceChangePercent")),"volume":safe(x.get("quoteVolume")),"funding":None,"oi":None,"quote":"USDT"} for x in raw if x.get("symbol") in names])
    if len(r)<20:raise ValueError(f"Binance: insufficient instruments {len(r)}")
    return r
def bybit():
    raw=fetch("https://api.bybit.com/v5/market/tickers?category=linear")
    if raw.get("retCode")!=0:raise ValueError("Bybit: "+str(raw.get("retMsg")))
    r=valid([{"symbol":x["symbol"],"price":safe(x.get("lastPrice")),"change":safe(x.get("price24hPcnt"))*100 if safe(x.get("price24hPcnt")) is not None else None,"volume":safe(x.get("turnover24h")),"funding":safe(x.get("fundingRate")),"oi":safe(x.get("openInterestValue")),"quote":"USDT"} for x in raw["result"]["list"] if re.fullmatch(r"[A-Z0-9]+USDT",x.get("symbol",""))])
    if len(r)<20:raise ValueError(f"Bybit: insufficient instruments {len(r)}")
    return r
def okx():
    raw=fetch("https://www.okx.com/api/v5/market/tickers?instType=SWAP")
    if raw.get("code")!="0":raise ValueError("OKX: request not successful")
    r=[]
    for x in raw.get("data",[]):
        if not re.fullmatch(r"[A-Z0-9]+-USDT-SWAP",x.get("instId","")):continue
        p=safe(x.get("last"));prev=safe(x.get("open24h"))
        q=safe(x.get("volCcyQuote24h")) or ((safe(x.get("volCcy24h")) or 0)*(p or 0))
        r.append({"symbol":x["instId"].replace("-USDT-SWAP","USDT"),"price":p,"change":(p/prev-1)*100 if p and prev else None,"volume":q,"funding":None,"oi":None,"quote":"USDT"})
    r=valid(r)
    if len(r)<20:raise ValueError(f"OKX: insufficient instruments {len(r)}")
    return r
def hyperliquid():
    raw=fetch("https://api.hyperliquid.xyz/info",{"type":"metaAndAssetCtxs"})
    if not isinstance(raw,list) or len(raw)!=2:raise ValueError("Hyperliquid unexpected response")
    universe=raw[0].get("universe",[])
    r=[]
    for meta,x in zip(universe,raw[1]):
        coin=meta.get("name","")
        if not re.fullmatch(r"[A-Z0-9]{2,20}",coin):continue
        p=safe(x.get("markPx")) or safe(x.get("midPx"))
        prev=safe(x.get("prevDayPx"))
        size=safe(x.get("openInterest"))
        r.append({"symbol":coin+"USDT","price":p,"change":(p/prev-1)*100 if p and prev else None,"volume":safe(x.get("dayNtlVlm")),"funding":safe(x.get("funding")),"oi":size*p if size and p else None,"quote":"USDC","venueCoin":coin})
    r=valid(r)
    if len(r)<20:raise ValueError(f"Hyperliquid insufficient instruments {len(r)}")
    return r
SOURCES=[("OKX",okx),("Hyperliquid",hyperliquid),("Bybit",bybit),("Binance",binance)]
def main():
    errors=[];provider=None;rows=[]
    for name,fn in SOURCES:
        try:
            started=time.time();rows=fn();provider=name
            print(f"[OK] {name}: {len(rows)} perpetual instruments, {time.time()-started:.2f}s",flush=True)
            break
        except Exception as exc:
            message=f"{name}: {str(exc)[:220]}"
            errors.append(message);print("[FAIL]",message,flush=True)
    fetched_at=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    obj={"provider":provider or "UNAVAILABLE","fetched_at":fetched_at,"generated_by":"GitHub Actions public API polling","quote":"USDC" if provider=="Hyperliquid" else "USDT","rows":rows,"errors":errors}
    # Never overwrite a valid published snapshot with an empty/unavailable response.
    if not provider:
        print("No market provider; retaining previous verified snapshot.",flush=True)
        sys.exit(2)
    temp=OUT.with_suffix(".json.tmp")
    temp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    temp.replace(OUT)
    print(f"snapshot={OUT} source={obj['provider']} rows={len(rows)} fetched={fetched_at}",flush=True)
if __name__=="__main__":main()
