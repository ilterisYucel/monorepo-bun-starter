import{t as e}from"./BSCCard-kTjcZPAl.js";var t={title:`Components/BSCCard`,component:e,tags:[`autodocs`]},n={args:{name:`BSC-1`,status:`online`,chargeStatus:`Charge`,soc:85,soh:96,rackCount:8,onlineRackCount:8,systemPowerKw:356,voltage:52.1,current:6.8,chargePowerKw:356,dischargePowerKw:0}},r={args:{name:`BSC-2`,status:`online`,chargeStatus:`Discharge`,soc:42,soh:91,rackCount:8,onlineRackCount:7,systemPowerKw:-220,voltage:48.9,current:-4.5,chargePowerKw:0,dischargePowerKw:220}},i={args:{name:`BSC-3`,status:`offline`,chargeStatus:`Idle`,soc:null,soh:null,rackCount:8,onlineRackCount:0,systemPowerKw:null,voltage:null,current:null,chargePowerKw:null,dischargePowerKw:null}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "BSC-1",
    status: "online",
    chargeStatus: "Charge",
    soc: 85,
    soh: 96,
    rackCount: 8,
    onlineRackCount: 8,
    systemPowerKw: 356,
    voltage: 52.1,
    current: 6.8,
    chargePowerKw: 356,
    dischargePowerKw: 0
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    name: "BSC-2",
    status: "online",
    chargeStatus: "Discharge",
    soc: 42,
    soh: 91,
    rackCount: 8,
    onlineRackCount: 7,
    systemPowerKw: -220,
    voltage: 48.9,
    current: -4.5,
    chargePowerKw: 0,
    dischargePowerKw: 220
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "BSC-3",
    status: "offline",
    chargeStatus: "Idle",
    soc: null,
    soh: null,
    rackCount: 8,
    onlineRackCount: 0,
    systemPowerKw: null,
    voltage: null,
    current: null,
    chargePowerKw: null,
    dischargePowerKw: null
  }
}`,...i.parameters?.docs?.source}}};var a=[`OnlineCharging`,`OnlineDischarging`,`Offline`];export{i as Offline,n as OnlineCharging,r as OnlineDischarging,a as __namedExportsOrder,t as default};