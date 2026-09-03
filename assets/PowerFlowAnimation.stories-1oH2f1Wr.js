import{t as e}from"./PowerFlowAnimation-BFs3zQPq.js";var t={title:`Graphics/Deprecated/PowerFlowAnimation`,component:e,tags:[`autodocs`]},n=Array.from({length:16},(e,t)=>({id:t+1,deviceId:`BSC-1`,name:`Rack-${t+1}`,status:t%5==4?`offline`:`online`,charge_status:`Charge`,soc:t%5==4?0:30+t*4,voltage:48,current:6,power_kw:.3,temperature:28})),r={args:{flowDirection:`Charge`,racks:n,height:260}},i={args:{flowDirection:`Discharge`,racks:n,height:260}},a={args:{flowDirection:`Idle`,racks:n,height:260}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    flowDirection: "Charge",
    racks,
    height: 260
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    flowDirection: "Discharge",
    racks,
    height: 260
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    flowDirection: "Idle",
    racks,
    height: 260
  }
}`,...a.parameters?.docs?.source}}};var o=[`Charge`,`Discharge`,`Idle`];export{r as Charge,i as Discharge,a as Idle,o as __namedExportsOrder,t as default};