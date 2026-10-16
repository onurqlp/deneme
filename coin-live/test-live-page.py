#!/usr/bin/env python3
import os,re,subprocess,sys,shutil
url=os.getenv("COIN_LIVE_URL","https://onurqlp.github.io/deneme/coin-live/")
chrome=next((shutil.which(x) for x in ["google-chrome","google-chrome-stable","chromium","chromium-browser"] if shutil.which(x)),None)
if not chrome:
    print("Browser binary not installed on runner",flush=True);sys.exit(3)
cmd=[chrome,"--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--hide-scrollbars","--virtual-time-budget=22000","--dump-dom",url]
print("Starting actual browser:",url,flush=True)
try:
    result=subprocess.run(cmd,capture_output=True,text=True,timeout=48)
except subprocess.TimeoutExpired as e:
    print("BROWSER TIMEOUT",flush=True);sys.exit(4)
html=result.stdout
def value(element):
    match=re.search(r'id="'+re.escape(element)+r'"[^>]*>(.*?)</',html,re.S|re.I)
    return re.sub(r'<.*?>',"",match.group(1)).strip() if match else None
for key in ["connection","sourceName","count","updated","error","proBTC","chartStatus"]:
    print(f"{key}={value(key)}",flush=True)
count=value("count")
if not count or not count.isdigit() or int(count)<20:
    print("FAIL: Dashboard did not populate public quotes in headless browser.",flush=True)
    print("Chrome stderr:",result.stderr[-2000:],flush=True)
    sys.exit(2)
print("PASS: actual webpage populated",count,"market quotes.",flush=True)
