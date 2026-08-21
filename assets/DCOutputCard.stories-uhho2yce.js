import{t as e}from"./DCOutputCard-D2xjQdSA.js";var t={title:`Components/DCOutputCard`,component:e,tags:[`autodocs`]},n={args:{name:`DC-1`,status:`online`,isOn:!0,actualVoltage:48.2,actualCurrent:12.1,setVoltage:48,setCurrent:12}},r={args:{name:`DC-1`,status:`online`,isOn:!1,actualVoltage:0,actualCurrent:0,setVoltage:48,setCurrent:12}},i={args:{name:`DC-2`,status:`offline`,isOn:!1,actualVoltage:null,actualCurrent:null,setVoltage:null,setCurrent:null}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    name: "DC-1",
    status: "online",
    isOn: true,
    actualVoltage: 48.2,
    actualCurrent: 12.1,
    setVoltage: 48,
    setCurrent: 12
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    name: "DC-1",
    status: "online",
    isOn: false,
    actualVoltage: 0,
    actualCurrent: 0,
    setVoltage: 48,
    setCurrent: 12
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "DC-2",
    status: "offline",
    isOn: false,
    actualVoltage: null,
    actualCurrent: null,
    setVoltage: null,
    setCurrent: null
  }
}`,...i.parameters?.docs?.source}}};var a=[`OnlineOn`,`OnlineOff`,`Offline`];export{i as Offline,r as OnlineOff,n as OnlineOn,a as __namedExportsOrder,t as default};