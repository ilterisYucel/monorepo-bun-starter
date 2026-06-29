import{s as e}from"./factories-BcOE1qn6.js";import{t}from"./RackCard-DHYJaHov.js";var n={title:`Components/RackCard`,component:t,tags:[`autodocs`]},r={args:e(`online`,`Charge`,{soc:85,voltage:48.5,current:15.2})},i={args:e(`online`,`Discharge`,{soc:42,voltage:46.1})},a={args:e(`offline`,`Idle`,{soc:null})},o={args:e(`online`,`Idle`,{soc:72})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: createMockRack("online", "Charge", {
    soc: 85,
    voltage: 48.5,
    current: 15.2
  })
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: createMockRack("online", "Discharge", {
    soc: 42,
    voltage: 46.1
  })
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: createMockRack("offline", "Idle", {
    soc: null
  })
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: createMockRack("online", "Idle", {
    soc: 72
  })
}`,...o.parameters?.docs?.source}}};var s=[`OnlineCharging`,`OnlineDischarging`,`Offline`,`Idle`];export{o as Idle,a as Offline,r as OnlineCharging,i as OnlineDischarging,s as __namedExportsOrder,n as default};