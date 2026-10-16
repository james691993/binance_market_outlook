import {ema,sma,macd,closes,previousWeekHigh} from './indicators.mjs';
const $=id=>document.getElementById(id), keys=['ema','ma','week','month','ma50','weekHigh'],labels=['Giá > EMA200 ngày','Giá > MA200 ngày','MACD tuần > 0','MACD tháng > 0','MA50 > MA200 ngày','Giá > đỉnh tuần trước'];
const stable=new Set('USDC FDUSD TUSD USDP DAI USDD USD1 USTC BUSD USDE USDS AEUR EURI RLUSD BFUSD'.split(' '));
let data=[],filter='all',total=0,completed=0,running=false,limited=false,report=null,sending=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path){for(let attempt=0;attempt<3;attempt++){if(limited)throw Error('Binance giới hạn truy cập');try{const response=await fetch('https://data-api.binance.vision/api/v3/'+path,{signal:AbortSignal.timeout(20000)});if(response.status===429||response.status===418){limited=true;throw Error('Binance giới hạn tốc độ (HTTP '+response.status+'). Vui lòng đợi vài phút rồi thử lại.')}if(!response.ok)throw Error('Binance HTTP '+response.status);return await response.json()}catch(e){if(limited||attempt===2)throw e;await sleep(1000*(attempt+1))}}}
function number(v){return v==null?'—':v.toLocaleString('en-US',{maximumSignificantDigits:7})}
function eligible(r,key){return r[key]!=null&&(key!=='ma50'||r.ma!=null)}
function qualifies(r,key){return eligible(r,key)&&(key==='ma50'?r.ma50>r.ma:['ema','ma','weekHigh'].includes(key)?r.price>r[key]:r[key]>0)}
function render(){
 $('cards').innerHTML=keys.map((key,i)=>{const valid=data.filter(r=>eligible(r,key)),count=valid.filter(r=>qualifies(r,key)).length,pct=valid.length?count/valid.length*100:0;return `<article class="card"><div class="top"><span>${labels[i]}</span><span class="index">0${i+1}</span></div><div class="num">${valid.length?count:'—'}<small>coin</small></div><div class="ratio">${valid.length?pct.toFixed(1)+'%':'—'} <span class="na">/ ${valid.length} đủ dữ liệu</span></div><div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="caption">${running?'Đang quét · kết quả một phần':data.length?'Kết quả lượt quét gần nhất':'Chưa có dữ liệu'} · ${data.filter(r=>!r.error&&!eligible(r,key)).length} thiếu lịch sử</div></article>`}).join('');
 const q=$('search').value.toUpperCase().trim(),visible=data.filter(r=>r.base.toUpperCase().includes(q)&&(filter==='all'||(filter==='error'?r.error:qualifies(r,filter)))).sort((a,b)=>b.volume-a.volume);
 $('rows').replaceChildren();for(const r of visible){const tr=document.createElement('tr'),coin=document.createElement('td'),b=document.createElement('b');b.textContent=r.base;coin.append(b,document.createTextNode(' / USDT'));if(r.error){const hint=document.createElement('small');hint.textContent=' · Lỗi tải';hint.title=r.error;coin.append(hint)}tr.append(coin);const price=document.createElement('td');price.textContent=number(r.price);tr.append(price);for(const key of keys){const td=document.createElement('td');td.textContent=number(r[key]);td.className=!eligible(r,key)?'na':qualifies(r,key)?'positive':'negative';tr.append(td)}$('rows').append(tr)}
 $('empty').style.display=visible.length?'none':'block';$('empty').textContent=data.length?'Không có coin phù hợp bộ lọc.':'Nhấn “Cập nhật dữ liệu” để quét thị trường.';
 $('foot').textContent=`${visible.length} hiển thị · ${completed}/${total} đã xử lý · ${data.filter(r=>r.error).length} coin có lỗi tải`;
 $('bar').style.width=total?(completed/total*100)+'%':'0';
}
async function scan(){if(running)return;running=true;limited=false;report=null;$('send-telegram').disabled=true;$('test-telegram').disabled=true;$('telegram-preview').textContent='Quét đang chạy…';$('telegram-status').textContent='Đợi quét hoàn tất để gửi báo cáo.';data=[];completed=0;total=0;render();$('refresh').disabled=true;$('scope').disabled=$('mode').disabled=$('stable').disabled=true;$('status').textContent='Đang lấy danh sách coin và giá hiện tại…';$('updated').textContent='Đang cập nhật';
 const scope=$('scope').value,live=$('mode').value==='live',exclude=$('stable').checked;
 try{const [info,tickers]=await Promise.all([api('exchangeInfo'),api('ticker/24hr')]);const quotes=new Map(tickers.map(t=>[t.symbol,t]));let symbols=info.symbols.filter(s=>s.status==='TRADING'&&s.quoteAsset==='USDT'&&s.isSpotTradingAllowed!==false&&(!exclude||!stable.has(s.baseAsset))&&quotes.has(s.symbol)).sort((a,b)=>Number(quotes.get(b.symbol).quoteVolume)-Number(quotes.get(a.symbol).quoteVolume));if(scope!=='all')symbols=symbols.slice(0,Number(scope));total=symbols.length;let cursor=0;
 async function worker(){while(cursor<symbols.length&&!limited){const s=symbols[cursor++],t=quotes.get(s.symbol),r={base:s.baseAsset,price:Number(t.lastPrice),volume:Number(t.quoteVolume),ema:null,ma:null,week:null,month:null,ma50:null,weekHigh:null};const results=await Promise.allSettled([api(`klines?symbol=${encodeURIComponent(s.symbol)}&interval=1d&limit=1000`),api(`klines?symbol=${encodeURIComponent(s.symbol)}&interval=1w&limit=1000`),api(`klines?symbol=${encodeURIComponent(s.symbol)}&interval=1M&limit=1000`)]);const now=Date.now();if(results[0].status==='fulfilled'){const c=closes(results[0].value,false,now);r.ema=ema(c,200);r.ma=sma(c,200);r.ma50=sma(c,50)}if(results[1].status==='fulfilled'){r.week=macd(closes(results[1].value,live,now));r.weekHigh=previousWeekHigh(results[1].value,now)}if(results[2].status==='fulfilled')r.month=macd(closes(results[2].value,live,now));const errors=results.filter(v=>v.status==='rejected');if(errors.length)r.error=errors.map(e=>e.reason.message).join('; ');data.push(r);completed++;$('status').textContent=`Đang quét ${completed}/${total} coin · ${s.baseAsset} · Kết quả một phần`;render();await sleep(650)}}
 await Promise.all([worker(),worker()]);$('status').textContent=limited?`Đã dừng do giới hạn Binance. Kết quả một phần: ${completed}/${total} coin.`:`Hoàn tất ${completed}/${total} coin${data.some(r=>r.error)?' · Có lỗi tải, xem bộ lọc Lỗi tải':''}`;$('updated').textContent='Cập nhật '+new Date().toLocaleString('vi-VN');
 if(!limited&&completed===total&&total>0){const lines=keys.map((key,i)=>{const valid=data.filter(r=>eligible(r,key)),count=valid.filter(r=>qualifies(r,key)).length;return `${labels[i]}: ${valid.length?(count/valid.length*100).toFixed(1)+'%':'Chưa đủ dữ liệu'}`});report=['BINANCE MARKET BREADTH',new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+' (giờ Việt Nam)',(scope==='all'?'Tất cả coin USDT':'Top '+scope+' USDT')+' · '+(exclude?'Loại stablecoin':'Gồm stablecoin')+' · MACD '+(live?'gồm nến đang chạy':'nến đã đóng'),'',...lines,'',`Đã quét ${completed} coin · % tính trên coin đủ dữ liệu từng chỉ số.`,...(data.some(r=>r.error)?[`Lưu ý: ${data.filter(r=>r.error).length} coin có lỗi tải.`]:[])].join('\n');$('telegram-preview').textContent=report;$('telegram-status').textContent='Báo cáo sẵn sàng. Kiểm tra channel và bấm gửi.';$('send-telegram').disabled=sending}else{$('telegram-status').textContent='Lượt quét chưa hoàn tất. Vui lòng quét lại trước khi gửi.'}

 }catch(e){$('status').textContent='Không tải được dữ liệu: '+e.message+'. Kiểm tra kết nối và thử lại.';$('updated').textContent='Cập nhật thất bại'}finally{running=false;$('test-telegram').disabled=sending;$('refresh').disabled=false;$('scope').disabled=$('mode').disabled=$('stable').disabled=false;render()}}
$('refresh').addEventListener('click',scan);$('search').addEventListener('input',render);$('filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('selected',x===b));render()});render();

async function sendTelegram(text,isTest=false){
 if(sending||running||!text)return;
 const token=$('bot-token').value.trim(),channel=$('channel-id').value.trim();
 if(!token||!channel){$('telegram-status').textContent='Vui lòng nhập Bot Token và Channel ID trước khi gửi.';return}
 sending=true;$('send-telegram').disabled=true;$('test-telegram').disabled=true;$('refresh').disabled=true;
 $('telegram-status').textContent=(isTest?'Đang gửi tin thử đến ':'Đang gửi tổng quan đến ')+channel+'…';
 try{const response=await fetch('/api/telegram',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,channel,text})});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Không gửi được tin nhắn.');$('telegram-status').textContent=isTest?'Gửi thử thành công đến '+channel+'. Token, Channel ID và quyền đăng bài đã hoạt động. Bạn có thể bắt đầu quét.':'Đã gửi tổng quan thành công đến '+channel+'.'}
 catch(e){$('telegram-status').textContent=e.message==='Failed to fetch'?'Chưa xác nhận được kết quả gửi. Kiểm tra channel trước khi thử lại.':e.message}
 finally{sending=false;$('send-telegram').disabled=!report||running;$('test-telegram').disabled=running;$('refresh').disabled=running}
}
$('send-telegram').addEventListener('click',()=>sendTelegram(report));
$('test-telegram').addEventListener('click',()=>sendTelegram('BINANCE MARKET BREADTH\n✅ Kết nối Telegram thành công. Bot có thể gửi tin nhắn vào channel này.\n'+new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+' (giờ Việt Nam)',true));

const telegramConfigKey='binance-breadth.telegram-config.v1';
function restoreTelegramConfig(){
 try{const raw=localStorage.getItem(telegramConfigKey);if(!raw)return;const saved=JSON.parse(raw);if(typeof saved.token!=='string'||typeof saved.channel!=='string')throw Error('invalid');$('bot-token').value=saved.token;$('channel-id').value=saved.channel;$('telegram-config-status').textContent='Đã tải cấu hình lưu trên trình duyệt này.'}
 catch{$('telegram-config-status').textContent='Không đọc được cấu hình đã lưu. Bạn có thể nhập lại và lưu.'}
}
$('save-telegram').addEventListener('click',()=>{
 const token=$('bot-token').value.trim(),channel=$('channel-id').value.trim();
 if(!/^\d{5,20}:[A-Za-z0-9_-]{20,120}$/.test(token)||!/^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100\d{5,20})$/.test(channel)){$('telegram-config-status').textContent='Nhập Bot Token và Channel ID hợp lệ trước khi lưu.';return}
 try{localStorage.setItem(telegramConfigKey,JSON.stringify({token,channel}));$('telegram-config-status').textContent='Đã lưu. Lần sau mở trang sẽ tự điền Bot Token và Channel ID.'}
 catch{$('telegram-config-status').textContent='Trình duyệt không cho phép lưu. Bạn vẫn có thể nhập và gửi trong phiên này.'}
});
$('clear-telegram').addEventListener('click',()=>{
 $('bot-token').value='';$('channel-id').value='';
 try{localStorage.removeItem(telegramConfigKey);$('telegram-config-status').textContent='Đã xóa Bot Token và Channel ID đã lưu.'}
 catch{$('telegram-config-status').textContent='Đã xóa ô nhập nhưng không xóa được dữ liệu lưu. Hãy xóa dữ liệu trang trong cài đặt trình duyệt.'}
});
for(const id of ['bot-token','channel-id'])$(id).addEventListener('input',()=>{$('telegram-config-status').textContent='Cấu hình đã thay đổi. Bấm Lưu cấu hình để nhớ thông tin mới.'});
restoreTelegramConfig();
