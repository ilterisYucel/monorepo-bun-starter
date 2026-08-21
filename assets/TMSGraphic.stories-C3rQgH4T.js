import{_ as e}from"./factories-9e-l2P_s.js";import{t}from"./TMSGraphic-DW2hTqPt.js";var n={title:`Graphics/Deprecated/TMSGraphic`,component:t,tags:[`autodocs`]},r=[e({temp:23.4}),e({temp:27.9}),e({temp:21.1,hvacs:[{status:`offline`,mode:`idle`},{status:`offline`,mode:`idle`}]})],i={args:{rooms:r,panel_temp:26.5,panel_humidity:48,status:`online`,width:820,bordered:!0,showRefresh:!1}},a={args:{rooms:r,panel_temp:26.5,status:`offline`,width:820,bordered:!0,showRefresh:!1}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    rooms,
    panel_temp: 26.5,
    panel_humidity: 48,
    status: "online",
    width: 820,
    bordered: true,
    showRefresh: false
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    rooms,
    panel_temp: 26.5,
    status: "offline",
    width: 820,
    bordered: true,
    showRefresh: false
  }
}`,...a.parameters?.docs?.source}}};var o=[`Online`,`Offline`];export{a as Offline,i as Online,o as __namedExportsOrder,n as default};