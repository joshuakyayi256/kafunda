process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const key='kfc_ceC_wrOrzbURrgZxMTcY5nNQSRQOShW0XyQsvsEr6Z6uiaeS';
const url=`https://kafundawines.com/wp-json/kafunda/v1/products?per_page=2&kkey=${key}`;

async function test(label, headers){
  try{
    const r=await fetch(url,{headers});
    const t=await r.text();
    const isBlock=t.includes('<!DOCTYPE html>')||t.includes('<html');
    console.log(`\n[${label}] HTTP ${r.status} ${isBlock?'>> BLOCK PAGE':'>> JSON OK'}`);
    if(!isBlock) console.log(t.slice(0,120));
  }catch(e){console.log(`\n[${label}] ERR ${e.message}`)}
}

await test('bare fetch', {});
await test('chrome UA only', {
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
});
await test('full browser headers', {
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language':'en-US,en;q=0.9',
  'Accept-Encoding':'gzip, deflate, br',
  'Sec-Ch-Ua':'"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="24"',
  'Sec-Ch-Ua-Mobile':'?0',
  'Sec-Ch-Ua-Platform':'"Windows"',
  'Sec-Fetch-Dest':'document',
  'Sec-Fetch-Mode':'navigate',
  'Sec-Fetch-Site':'none',
  'Sec-Fetch-User':'?1',
  'Upgrade-Insecure-Requests':'1',
  'Referer':'https://kafundawines.com/'
});
