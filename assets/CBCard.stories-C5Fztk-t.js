import{t as e}from"./CBCard-B3vQ7YXf.js";var t={title:`Components/CBCard`,component:e,tags:[`autodocs`]},n={args:{name:`CB-1`,status:`online`,isClosed:!0,isTripped:!1,voltage:400.2,current:12.4,tripCount:2,closeCount:31}},r={args:{name:`CB-1`,status:`online`,isClosed:!1,isTripped:!1,voltage:398.8,current:0,tripCount:2,closeCount:31}},i={args:{name:`CB-1`,status:`online`,isClosed:!1,isTripped:!0,voltage:0,current:0,tripCount:3,closeCount:31}},a={args:{name:`CB-2`,status:`offline`,isClosed:!1,isTripped:!1,voltage:null,current:null,tripCount:0,closeCount:12}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-1",
    status: "online",
    isClosed: true,
    isTripped: false,
    voltage: 400.2,
    current: 12.4,
    tripCount: 2,
    closeCount: 31
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-1",
    status: "online",
    isClosed: false,
    isTripped: false,
    voltage: 398.8,
    current: 0,
    tripCount: 2,
    closeCount: 31
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-1",
    status: "online",
    isClosed: false,
    isTripped: true,
    voltage: 0,
    current: 0,
    tripCount: 3,
    closeCount: 31
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-2",
    status: "offline",
    isClosed: false,
    isTripped: false,
    voltage: null,
    current: null,
    tripCount: 0,
    closeCount: 12
  }
}`,...a.parameters?.docs?.source}}};var o=[`OnlineClosed`,`OnlineOpen`,`Tripped`,`Offline`];export{a as Offline,n as OnlineClosed,r as OnlineOpen,i as Tripped,o as __namedExportsOrder,t as default};