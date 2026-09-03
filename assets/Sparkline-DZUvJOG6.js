import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./react-BLJmJXjR.js";import{t as n}from"./jsx-runtime-DKdBMi_L.js";import{t as r}from"./uPlot.min-CKCejWS9.js";var i=n(),a=e(t(),1),o=({data:e,color:t,height:n=46})=>{let o=(0,a.useRef)(null),c=(0,a.useRef)(null),l=(0,a.useMemo)(()=>{if(e.length===0)return null;let t=[...e].sort((e,t)=>new Date(e.time).getTime()-new Date(t.time).getTime()).filter(e=>!Number.isNaN(new Date(e.time).getTime()));return t.length===0?null:[t.map(e=>new Date(e.time).getTime()/1e3),t.map(e=>typeof e.value==`number`?e.value:null)]},[e]);return(0,a.useEffect)(()=>{let e=o.current;if(!e)return;if(!l){c.current&&=(c.current.destroy(),null);return}let i={width:e.getBoundingClientRect().width||300,height:n,ms:.001,series:[{},{stroke:t,width:1.5,fill:e=>{let n=e.bbox,r=e.ctx.createLinearGradient(0,n.top,0,n.top+n.height);return r.addColorStop(0,s(t,.35)),r.addColorStop(1,s(t,.02)),r},spanGaps:!0}],legend:{show:!1},cursor:{show:!1},axes:[],scales:{x:{time:!0},y:{auto:!0}}};c.current?c.current.setData(l):c.current=new r(i,l,e)},[l,t,n]),(0,a.useEffect)(()=>{let e=o.current;if(!e)return;let t=0,n=new ResizeObserver(()=>{t||=requestAnimationFrame(()=>{if(t=0,c.current&&e){let t=e.getBoundingClientRect();c.current.setSize({width:t.width,height:t.height})}})});return n.observe(e),()=>{n.disconnect(),t&&cancelAnimationFrame(t)}},[]),(0,a.useEffect)(()=>()=>{c.current?.destroy(),c.current=null},[]),(0,i.jsx)(`div`,{ref:o,style:{width:`100%`,height:`${n}px`,position:`relative`}})},s=(e,t)=>{let n=/^#?([0-9a-f]{6})$/i.exec(e.trim())?.[1];if(!n)return e;let r=parseInt(n,16);return`rgba(${r>>16&255}, ${r>>8&255}, ${r&255}, ${t})`};o.__docgenInfo={description:`Sparkline — eksensiz, tek serili alan grafiği (uPlot).

Kontrat:
- \`data\` (SparklinePoint[]: { time: ISO string, value: number }) zamana
  göre içeride sıralanır — girdi mutate EDİLMEZ (kopya üzerinde sıralama).
- Geçersiz tarihli noktalar seriden atlanır (NaN timestamp uPlot'ı bozar);
  sayısal olmayan value'lar null sayılır (uPlot spanGaps davranışı).
- \`color\` (hex) seri rengidir; alan dolgusu dikey linearGradient:
  üstte %35 opaklık → altta %2 opaklık (eski recharts AreaChart eşdeğeri).
- Eksen/tick/legend/cursor YOKTUR — saf mini grafik.
- data değişince chart yeniden KURULMAZ; mevcut instance \`setData\` ile
  güncellenir. Unmount'ta \`destroy\` çağrılır (canvas sızıntısı yok).
- Yan etki: yalnızca kendi container div'ine yazar.

@remarks
Yükseklik prop'u hem container div'ine hem uPlot opts'a verilir;
genişlik ResizeObserver ile canlı takip edilir (kart ızgarası
yeniden akarken grafik bozulmaz).`,methods:[],displayName:`Sparkline`,props:{data:{required:!0,tsType:{name:`Array`,elements:[{name:`SparklinePoint`}],raw:`SparklinePoint[]`},description:``},color:{required:!0,tsType:{name:`string`},description:``},height:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`46`,computed:!1}}}};export{o as t};