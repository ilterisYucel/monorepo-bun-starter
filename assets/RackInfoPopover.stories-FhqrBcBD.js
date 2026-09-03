import{f as e}from"./factories-9e-l2P_s.js";import{t}from"./RackInfoPopover-NifK_152.js";var n={title:`Graphics/RackInfoPopover`,component:t,tags:[`autodocs`]},r={args:{rack:e(`online`,`Charge`,{soc:85,voltage:48.5,current:15.2,temperature:28}),x:120,y:60,visible:!0,onClose:()=>{}}},i={args:{rack:e(`offline`,`Idle`,{soc:0}),x:120,y:60,visible:!1,onClose:()=>{}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    rack: createMockRack("online", "Charge", {
      soc: 85,
      voltage: 48.5,
      current: 15.2,
      temperature: 28
    }),
    x: 120,
    y: 60,
    visible: true,
    onClose: () => {}
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    rack: createMockRack("offline", "Idle", {
      soc: 0
    }),
    x: 120,
    y: 60,
    visible: false,
    onClose: () => {}
  }
}`,...i.parameters?.docs?.source}}};var a=[`Visible`,`Hidden`];export{i as Hidden,r as Visible,a as __namedExportsOrder,n as default};