import{t as e}from"./DeviceTable-DlR13L9h.js";var t={title:`Components/DeviceTable`,component:e,tags:[`autodocs`]},n={args:{devices:[{id:`bsc-1`,name:`BSC-1`,type:`bsc`,protocol:`modbus`,rack_count:8,model:`LG BSC`,status:`online`,poll_interval_ms:1e3,last_seen:new Date().toISOString()},{id:`hvac-1`,name:`HVAC-1`,type:`hvac`,protocol:`modbus`,rack_count:null,model:`General HVAC`,status:`online`,poll_interval_ms:5e3,last_seen:new Date().toISOString()},{id:`cb-1`,name:`CB-1`,type:`breaker`,protocol:`modbus`,rack_count:null,model:null,status:`offline`,poll_interval_ms:1e3,last_seen:null}]}},r={args:{devices:[],isLoading:!0}},i={args:{devices:[]}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    devices
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    devices: [],
    isLoading: true
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    devices: []
  }
}`,...i.parameters?.docs?.source}}};var a=[`Default`,`Loading`,`Empty`];export{n as Default,i as Empty,r as Loading,a as __namedExportsOrder,t as default};