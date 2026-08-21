import{t as e}from"./factories-9e-l2P_s.js";import{t}from"./BSCGraphic-CCEIy_Mz.js";var n={title:`Graphics/Deprecated/BSCGraphic`,component:t,tags:[`autodocs`]},r=e({deviceId:`BSC-1`,racks:Array.from({length:8},(e,t)=>({id:t+1,deviceId:`BSC-1`,name:`Rack-${t+1}`,status:t===2?`offline`:`online`,charge_status:`Charge`,soc:t===2?0:40+t*6,voltage:48,current:6,power_kw:.3,temperature:28}))}),i={args:{deviceId:`BSC-1`,bscUnits:[r],flowDirection:`Charge`,width:820,bordered:!0,showRefresh:!1}},a={args:{deviceId:`BSC-1`,bscUnits:[r],flowDirection:`Discharge`,width:820,bordered:!0,showRefresh:!1}},o={args:{deviceId:`BSC-1`,bscUnits:[r],flowDirection:`Idle`,width:820,bordered:!0,showRefresh:!1}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "BSC-1",
    bscUnits: [unit],
    flowDirection: "Charge",
    width: 820,
    bordered: true,
    showRefresh: false
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "BSC-1",
    bscUnits: [unit],
    flowDirection: "Discharge",
    width: 820,
    bordered: true,
    showRefresh: false
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "BSC-1",
    bscUnits: [unit],
    flowDirection: "Idle",
    width: 820,
    bordered: true,
    showRefresh: false
  }
}`,...o.parameters?.docs?.source}}};var s=[`ChargeMode`,`DischargeMode`,`IdleMode`];export{i as ChargeMode,a as DischargeMode,o as IdleMode,s as __namedExportsOrder,n as default};