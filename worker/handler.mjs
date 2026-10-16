const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function telegram(request,send=fetch){
 if(request.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
 const url=new URL(request.url);
 if(request.headers.get('origin')!==url.origin)return json({error:'Yêu cầu phải đến từ ứng dụng.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Dữ liệu không hợp lệ.'},415);
 if(Number(request.headers.get('content-length'))>12000)return json({error:'Nội dung quá dài.'},413);
 let body;try{const raw=await request.text();if(raw.length>12000)return json({error:'Nội dung quá dài.'},413);body=JSON.parse(raw)}catch{return json({error:'Dữ liệu không hợp lệ.'},400)}
 const {token,channel,text}=body??{};
 if(typeof token!=='string'||!/^\d{5,20}:[A-Za-z0-9_-]{20,120}$/.test(token))return json({error:'Bot Token không đúng định dạng.'},400);
 if(typeof channel!=='string'||!/^(@[A-Za-z][A-Za-z0-9_]{4,31}|-100\d{5,20})$/.test(channel))return json({error:'Nhập @username channel hoặc ID dạng -100…'},400);
 if(typeof text!=='string'||!text.startsWith('BINANCE MARKET BREADTH\n')||text.length>4000)return json({error:'Nội dung báo cáo không hợp lệ.'},400);
 try{const res=await send(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:channel,text}),signal:AbortSignal.timeout(15000)});const result=await res.json();
 if(!res.ok||!result.ok){const code=result.error_code??res.status;const description=String(result.description??'').toLowerCase();const error=description.includes('chat not found')?'Telegram không tìm thấy channel. Kiểm tra @username hoặc ID -100… và thêm bot vào channel.':description.includes('not enough rights')?'Bot chưa đủ quyền đăng bài. Hãy thêm bot làm quản trị viên channel và bật quyền Post Messages.':code===401?'Bot Token không hợp lệ.':code===403?'Bot chưa có quyền đăng bài trong channel.':code===429?'Telegram giới hạn tốc độ. Vui lòng đợi rồi thử lại.':'Không gửi được. Kiểm tra Channel ID và quyền quản trị viên của bot.';return json({error},502)}
 return json({ok:true,messageId:result.result?.message_id??null,chatTitle:result.result?.chat?.title??null});
 }catch{return json({error:'Chưa xác nhận được kết quả gửi. Kiểm tra channel trước khi thử lại để tránh gửi trùng.'},502)}
}
