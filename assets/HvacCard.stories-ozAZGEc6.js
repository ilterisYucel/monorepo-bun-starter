import{t as e}from"./HvacCard-COJrsZ62.js";var t={title:`Components/HvacCard`,component:e,tags:[`autodocs`]},n={args:{name:`HVAC-1`,room:`Oda 1`,status:`running`,currentTemp:26.4,mode:`cooling`,setTemp:24,supplyTemp:17.2,returnTemp:26.1,returnHumidity:52,supplyHumidity:48,equipmentStatus:`cooling`,alarmCount:0}},r={args:{name:`HVAC-1`,room:`Oda 1`,status:`running`,currentTemp:18.2,mode:`warming`,setTemp:24,supplyTemp:31.5,returnTemp:18.4,returnHumidity:44,supplyHumidity:40,equipmentStatus:`heating`,alarmCount:0}},i={args:{name:`HVAC-1`,room:`Oda 1`,status:`fault`,currentTemp:34.8,mode:`idle`,setTemp:24,supplyTemp:null,returnTemp:34.6,returnHumidity:61,supplyHumidity:null,equipmentStatus:`fault`,alarmCount:2}},a={args:{name:`HVAC-2`,room:`Oda 2`,status:`standby`,currentTemp:23.1,mode:`idle`,setTemp:24}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "HVAC-1",
    room: "Oda 1",
    status: "running",
    currentTemp: 26.4,
    mode: "cooling",
    setTemp: 24,
    supplyTemp: 17.2,
    returnTemp: 26.1,
    returnHumidity: 52,
    supplyHumidity: 48,
    equipmentStatus: "cooling",
    alarmCount: 0
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    name: "HVAC-1",
    room: "Oda 1",
    status: "running",
    currentTemp: 18.2,
    mode: "warming",
    setTemp: 24,
    supplyTemp: 31.5,
    returnTemp: 18.4,
    returnHumidity: 44,
    supplyHumidity: 40,
    equipmentStatus: "heating",
    alarmCount: 0
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "HVAC-1",
    room: "Oda 1",
    status: "fault",
    currentTemp: 34.8,
    mode: "idle",
    setTemp: 24,
    supplyTemp: null,
    returnTemp: 34.6,
    returnHumidity: 61,
    supplyHumidity: null,
    equipmentStatus: "fault",
    alarmCount: 2
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    name: "HVAC-2",
    room: "Oda 2",
    status: "standby",
    currentTemp: 23.1,
    mode: "idle",
    setTemp: 24
  }
}`,...a.parameters?.docs?.source}}};var o=[`RunningCooling`,`RunningWarming`,`Fault`,`Standby`];export{i as Fault,n as RunningCooling,r as RunningWarming,a as Standby,o as __namedExportsOrder,t as default};