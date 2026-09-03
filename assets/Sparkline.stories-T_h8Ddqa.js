import{n as e}from"./tokens-CTJm1Bh4.js";import"./colors-BCHOZIGi.js";import{t}from"./Sparkline-DZUvJOG6.js";var n={title:`Components/Sparkline`,component:t,tags:[`autodocs`]},r=(e,t,n)=>Array.from({length:t},(t,r)=>({time:new Date(e+r*6e4).toISOString(),value:50+Math.round(Math.sin(r/6)*n*10)/10})),i={args:{data:r(Date.now()-60*6e4,60,2),color:e.success,height:46}},a={args:{data:r(Date.now()-60*6e4,60,4),color:e.warning}},o={args:{data:[],color:e.success}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    data: series(Date.now() - 60 * 60_000, 60, 2),
    color: COLORS.success,
    height: 46
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    data: series(Date.now() - 60 * 60_000, 60, 4),
    color: COLORS.warning
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    data: [],
    color: COLORS.success
  }
}`,...o.parameters?.docs?.source}}};var s=[`Default`,`Warning`,`Empty`];export{i as Default,o as Empty,a as Warning,s as __namedExportsOrder,n as default};