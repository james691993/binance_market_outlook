export function ema(values, period) {
  if(values.length<period) return null;
  let result=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<values.length;i++) result+=(values[i]-result)*2/(period+1);
  return result;
}
export function sma(values, period) {return values.length<period?null:values.slice(-period).reduce((a,b)=>a+b,0)/period}
export function macd(values){return values.length<26?null:ema(values,12)-ema(values,26)}
export function closes(klines,includeLive=false,now=Date.now()){return klines.filter(k=>includeLive||Number(k[6])<now).map(k=>Number(k[4]))}
