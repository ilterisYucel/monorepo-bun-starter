import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./react-BLJmJXjR.js";import{t as n}from"./jsx-runtime-DKdBMi_L.js";import{n as r}from"./tokens-CTJm1Bh4.js";import"./colors-D5C2JSQ7.js";import{t as i}from"./uPlot.min-CKCejWS9.js";var a=n(),o=e(t(),1),s=({data:e,color:t,height:n=46})=>{let r=(0,o.useRef)(null),s=(0,o.useRef)(null),l=(0,o.useMemo)(()=>{if(e.length===0)return null;let t=[...e].sort((e,t)=>new Date(e.time).getTime()-new Date(t.time).getTime()).filter(e=>!Number.isNaN(new Date(e.time).getTime()));return t.length===0?null:[t.map(e=>new Date(e.time).getTime()/1e3),t.map(e=>typeof e.value==`number`?e.value:null)]},[e]);return(0,o.useEffect)(()=>{let e=r.current;if(!e)return;if(!l){s.current&&=(s.current.destroy(),null);return}let a={width:e.getBoundingClientRect().width||300,height:n,ms:.001,series:[{},{stroke:t,width:1.5,fill:e=>{let n=e.bbox,r=e.ctx.createLinearGradient(0,n.top,0,n.top+n.height);return r.addColorStop(0,c(t,.35)),r.addColorStop(1,c(t,.02)),r},spanGaps:!0}],legend:{show:!1},cursor:{show:!1},axes:[],scales:{x:{time:!0},y:{auto:!0}}};s.current?s.current.setData(l):s.current=new i(a,l,e)},[l,t,n]),(0,o.useEffect)(()=>{let e=r.current;if(!e)return;let t=0,n=new ResizeObserver(()=>{t||=requestAnimationFrame(()=>{if(t=0,s.current&&e){let t=e.getBoundingClientRect();s.current.setSize({width:t.width,height:t.height})}})});return n.observe(e),()=>{n.disconnect(),t&&cancelAnimationFrame(t)}},[]),(0,o.useEffect)(()=>()=>{s.current?.destroy(),s.current=null},[]),(0,a.jsx)(`div`,{ref:r,style:{width:`100%`,height:`${n}px`,position:`relative`}})},c=(e,t)=>{let n=/^#?([0-9a-f]{6})$/i.exec(e.trim())?.[1];if(!n)return e;let r=parseInt(n,16);return`rgba(${r>>16&255}, ${r>>8&255}, ${r&255}, ${t})`};s.__docgenInfo={description:`Sparkline — eksensiz, tek serili alan grafiği (uPlot).

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
yeniden akarken grafik bozulmaz).`,methods:[],displayName:`Sparkline`,props:{data:{required:!0,tsType:{name:`Array`,elements:[{name:`SparklinePoint`}],raw:`SparklinePoint[]`},description:``},color:{required:!0,tsType:{name:`string`},description:``},height:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`46`,computed:!1}}}};var l={title:`Components/Sparkline`,component:s,tags:[`autodocs`]},u=(e,t,n)=>Array.from({length:t},(t,r)=>({time:new Date(e+r*6e4).toISOString(),value:50+Math.round(Math.sin(r/6)*n*10)/10})),d={args:{data:u(Date.now()-60*6e4,60,2),color:r.success,height:46}},f={args:{data:u(Date.now()-60*6e4,60,4),color:r.warning}},p={args:{data:[],color:r.success}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    data: series(Date.now() - 60 * 60_000, 60, 2),
    color: COLORS.success,
    height: 46
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    data: series(Date.now() - 60 * 60_000, 60, 4),
    color: COLORS.warning
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    data: [],
    color: COLORS.success
  }
}`,...p.parameters?.docs?.source}}};var m=[`Default`,`Warning`,`Empty`];export{d as Default,p as Empty,f as Warning,m as __namedExportsOrder,l as default};