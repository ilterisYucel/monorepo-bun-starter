import{t as e}from"./CBCard-Bb2csLJu.js";var t={title:`Components/CBCard`,component:e,tags:[`autodocs`]},n={args:{name:`CB-1`,status:`online`,isClosed:!0,isOpen:!1}},r={args:{name:`CB-1`,status:`online`,isClosed:!1,isOpen:!0}},i={args:{name:`CB-2`,status:`offline`,isClosed:!1,isOpen:!0}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-1",
    status: "online",
    isClosed: true,
    isOpen: false
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-1",
    status: "online",
    isClosed: false,
    isOpen: true
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "CB-2",
    status: "offline",
    isClosed: false,
    isOpen: true
  }
}`,...i.parameters?.docs?.source}}};var a=[`OnlineClosed`,`OnlineOpen`,`Offline`];export{i as Offline,n as OnlineClosed,r as OnlineOpen,a as __namedExportsOrder,t as default};