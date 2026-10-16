#!/usr/bin/env python3
"""COIN.LIVE signal engine. Public, unauthenticated exchange OHLC only.
No predictions of certainty, no orders. Uses closed candles.
"""
import concurrent.futures, datetime, json, math, pathlib, statistics, time, urllib.parse, urllib.request
BASE=pathlib.Path(__file__).resolve().parent
SNAP=BASE/"market-snapshot.json"
OUT=BASE/"signals-snapshot.json"
def req(url,body=None):
    headers={"User-Agent":"CoinLive-Research/1.0","Accept":"application/json"}
    data=json.dumps(body).encode() if body is not None else None
    if data is not None:headers["Content-Type"]="application/json"
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers,data=data),timeout=10) as response:
        return json.load(response)
def bars(symbol,tf,provider):
    if provider=="OKX":
        name=symbol.replace("USDT","-USDT-SWAP")
        vals=req("https://www.okx.com/api/v5/market/candles?"+
                 urllib.parse.urlencode({"instId":name,"bar":{"15m":"15m","1h":"1H","4h":"4H"}[tf],"limit":90}))
        if vals.get("code")!="0":raise RuntimeError("OKX error "+str(vals.get("msg")))
        data=vals["data"]
        return sorted([{"t":int(x[0]),"o":float(x[1]),"h":float(x[2]),"l":float(x[3]),"c":float(x[4]),"v":float(x[5])} for x in data],key=lambda x:x["t"])
    if provider=="Bybit":
        vals=req("https://api.bybit.com/v5/market/kline?"+
                 urllib.parse.urlencode({"category":"linear","symbol":symbol,"interval":{"15m":"15","1h":"60","4h":"240"}[tf],"limit":90}))
        if vals.get("retCode")!=0:raise RuntimeError("Bybit kline error")
        return sorted([{"t":int(x[0]),"o":float(x[1]),"h":float(x[2]),"l":float(x[3]),"c":float(x[4]),"v":float(x[5])} for x in vals["result"]["list"]],key=lambda x:x["t"])
    if provider=="Binance":
        vals=req("https://fapi.binance.com/fapi/v1/klines?"+urllib.parse.urlencode({"symbol":symbol,"interval":tf,"limit":90}))
        return [{"t":int(x[0]),"o":float(x[1]),"h":float(x[2]),"l":float(x[3]),"c":float(x[4]),"v":float(x[5])} for x in vals]
    if provider=="Hyperliquid":
        coin=symbol[:-4]
        now=int(time.time()*1000)
        span={"15m":900000,"1h":3600000,"4h":14400000}[tf]
        vals=req("https://api.hyperliquid.xyz/info",{"type":"candleSnapshot","req":{"coin":coin,"interval":tf,"startTime":now-span*100,"endTime":now}})
        return sorted([{"t":int(x["t"]),"o":float(x["o"]),"h":float(x["h"]),"l":float(x["l"]),"c":float(x["c"]),"v":float(x["v"])} for x in vals],key=lambda x:x["t"])
    raise ValueError("Unsupported OHLC provider")
def ema(values,period):
    k=2/(period+1);v=values[0]
    for z in values[1:]:v=z*k+v*(1-k)
    return v
def rsi(prices):
    changes=[prices[i]-prices[i-1] for i in range(-14,0)]
    gains=sum(max(0,x) for x in changes)/14
    losses=sum(max(0,-x) for x in changes)/14
    return 100 if losses==0 else (100-100/(1+gains/losses))
def atr(vals):
    p=vals[-15:]
    return sum(max(x["h"]-x["l"],abs(x["h"]-y["c"]),abs(x["l"]-y["c"])) for x,y in zip(p[1:],p[:-1]))/14
def measure(row,provider):
    symbol=row["symbol"]
    try:
        cc={tf:bars(symbol,tf,provider) for tf in ("15m","1h","4h")}
        now=int(time.time()*1000)
        # Prefer closed candles, exclude a candle whose end isn't reached.
        duration={"15m":900000,"1h":3600000,"4h":14400000}
        for tf in cc:
            cc[tf]=[x for x in cc[tf] if x["t"]+duration[tf]<=now-2000]
        a,b,c=cc["15m"],cc["1h"],cc["4h"]
        if min(len(a),len(b),len(c))<55:raise ValueError("insufficient closed candles")
        close_a=[x["c"] for x in a];close_b=[x["c"] for x in b];close_c=[x["c"] for x in c]
        e20=ema(close_b[-65:],20);e50=ema(close_b[-65:],50);e4=ema(close_c[-65:],20);e15=ema(close_a[-65:],20)
        momentum=rsi(close_b);volbase=sum(x["v"] for x in a[-21:-1])/20
        volratio=a[-1]["v"]/volbase if volbase>0 else 0
        volat=atr(a)
        p=float(row["price"]);gap=abs(p-a[-1]["c"])/p
        width=statistics.pstdev(close_a[-20:])*4/(sum(close_a[-20:])/20)*100 if sum(close_a[-20:])>0 else None
        highs=max(x["h"] for x in a[-9:-1]);lows=min(x["l"] for x in a[-9:-1])
        prev=a[-2];last=a[-1]
        bull=e20>e50 and b[-1]["c"]>e20 and c[-1]["c"]>e4 and p>e15 and 49<momentum<74
        bear=e20<e50 and b[-1]["c"]<e20 and c[-1]["c"]<e4 and p<e15 and 26<momentum<51
        trigup=(last["c"]>highs and last["c"]>last["o"]) or (prev["c"]<e15 and last["c"]>e15 and last["c"]>last["o"])
        trigdown=(last["c"]<lows and last["c"]<last["o"]) or (prev["c"]>e15 and last["c"]<e15 and last["c"]<last["o"])
        dist=max(p*.009,volat*1.7);dist_pct=dist/p*100
        direction="AL" if bull and trigup and volratio>=1.15 else "SAT" if bear and trigdown and volratio>=1.15 else "BEKLE"
        if not (0.3<=dist_pct<=5.5) or gap>.045:direction="BEKLE"
        side=1 if direction=="AL" else -1
        score=max(0,min(100,int(18+max(0,min(23,(volratio-1)*12))+max(0,min(24,(7-(width or 15))*3))+max(0,min(14,14-abs(row.get("change") or 0)))+(15 if bull or bear else 0)+(8 if direction!="BEKLE" else 0))))
        if abs(row.get("change") or 0)>20:score=max(0,score-15)
        # Pre-breakout forecast is not a probability.
        if direction=="BEKLE":entry=stop=None;targets=[]
        else:
            entry=p;stop=round(p-side*dist,10);targets=[round(p+side*dist*k,10) for k in (1,2,3)]
        return {"symbol":symbol,"quote":row.get("quote","USDT"),"signal":direction,"score":score,"price":p,"entry":entry,"stop":stop,"targets":targets,
                "stop_pct":round(dist_pct,3),"rsi":round(momentum,1),"bb_width":round(width,2) if width is not None else None,
                "vol_ratio":round(volratio,2),"atr":round(volat,10),"ema_1h_20":round(e20,10),
                "trend":"YUKARI" if bull else "AŞAĞI" if bear else "KARIŞIK","change":row.get("change"),"volume":row.get("volume"),
                "analysis_time":datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                "why":("Kırılım + hacim + 4H/1H uyumu" if direction!="BEKLE" else "1H/4H trend veya 15m giriş teyidi eksik"),
                "candles_15m":[[x["t"],x["o"],x["h"],x["l"],x["c"],x["v"]] for x in a[-70:]]}
    except Exception as exc:
        return {"symbol":symbol,"signal":"BEKLE","score":0,"why":"Mum verisi doğrulanamadı","error":str(exc)[:130]}
def main():
    market=json.loads(SNAP.read_text())
    rows=market.get("rows",[]);provider=market.get("provider")
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    if not rows or provider not in ("OKX","Bybit","Binance","Hyperliquid"):
        raise RuntimeError("No trusted market data for signal analysis")
    by_volume=sorted(rows,key=lambda x:x.get("volume") or 0,reverse=True)[:28]
    candidates=sorted([x for x in rows if abs(x.get("change") or 0)<13],key=lambda x:abs(x.get("change") or 0)*math.sqrt(max(0,x.get("volume") or 0)),reverse=True)[:14]
    selected=list({x["symbol"]:x for x in by_volume+candidates}.values())[:42]
    begin=time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        signals=list(pool.map(lambda row:measure(row,provider),selected))
    good=[x for x in signals if x["score"]>0]
    output={"provider":provider,"fetched_at":stamp,"market_fetched_at":market.get("fetched_at"),"total_market":len(rows),
            "analyzed":len(good),"selected":len(selected),"signals":sorted(signals,key=lambda x:x.get("score",0),reverse=True),
            "disclaimer":"Conditional price/volatility scenarios. Not verified predictive probability or a guarantee."}
    OUT.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"PROVIDER={provider} ANALYZED={len(good)}/{len(selected)} AL={sum(x['signal']=='AL' for x in signals)} SAT={sum(x['signal']=='SAT' for x in signals)} WAIT={sum(x['signal']=='BEKLE' for x in signals)} DURATION={time.time()-begin:.1f}s")
if __name__=="__main__":main()
