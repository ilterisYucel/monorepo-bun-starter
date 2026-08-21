import{t as e}from"./ContainerCard-CJsHypPl.js";var t={title:`Components/ContainerCard`,component:e,tags:[`autodocs`]},n={args:{containerId:`container-1`,name:`Konteyner 1`,status:`online`,connected:!0,soc:82,powerKw:420,temperature:27,deviceCount:5,activeDeviceCount:5}},r={args:{containerId:`container-2`,name:`Konteyner 2`,status:`warning`,connected:!0,soc:55,powerKw:-180,temperature:34,deviceCount:5,activeDeviceCount:4}},i={args:{containerId:`container-3`,name:`Konteyner 3`,status:`offline`,connected:!1,deviceCount:5,activeDeviceCount:0}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    containerId: "container-1",
    name: "Konteyner 1",
    status: "online",
    connected: true,
    soc: 82,
    powerKw: 420,
    temperature: 27,
    deviceCount: 5,
    activeDeviceCount: 5
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    containerId: "container-2",
    name: "Konteyner 2",
    status: "warning",
    connected: true,
    soc: 55,
    powerKw: -180,
    temperature: 34,
    deviceCount: 5,
    activeDeviceCount: 4
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    containerId: "container-3",
    name: "Konteyner 3",
    status: "offline",
    connected: false,
    deviceCount: 5,
    activeDeviceCount: 0
  }
}`,...i.parameters?.docs?.source}}};var a=[`OnlineConnected`,`WarningConnected`,`OfflineDisconnected`];export{i as OfflineDisconnected,n as OnlineConnected,r as WarningConnected,a as __namedExportsOrder,t as default};