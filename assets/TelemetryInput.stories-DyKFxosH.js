import{t as e}from"./TelemetryInput-o6aIYrkD.js";var t={title:`Core/TelemetryInput`,component:e,tags:[`autodocs`],argTypes:{value:{control:`number`},name:{control:`text`},unit:{control:`text`},status:{control:`radio`,options:[`nominal`,`warning`,`alarm`]},size:{control:`radio`,options:[`small`,`medium`,`large`]},disabled:{control:`boolean`},showRangeBar:{control:`boolean`}}},n=()=>{},r={args:{name:`DC Voltage`,value:48.2,unit:`V`,status:`nominal`,onChange:n}},i={args:{name:`Battery SoC`,value:12.5,unit:`%`,status:`warning`,warningThreshold:20,onChange:n,min:0,max:100}},a={args:{name:`Battery SoC`,value:3.2,unit:`%`,status:`alarm`,alarmThreshold:5,onChange:n,min:0,max:100}},o={args:{name:`Rack-1 Cell-3`,value:3.72,unit:`V`,tags:{rack_id:`1`,cell:`3`,zone:`A`},onChange:n}},s={args:{name:`Disabled Input`,value:25,unit:`A`,disabled:!0,onChange:n}},c={args:{name:`Setpoint`,value:65,unit:`%`,showRangeBar:!0,min:0,max:100,onChange:n}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    name: "DC Voltage",
    value: 48.2,
    unit: "V",
    status: "nominal",
    onChange: noop
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    name: "Battery SoC",
    value: 12.5,
    unit: "%",
    status: "warning",
    warningThreshold: 20,
    onChange: noop,
    min: 0,
    max: 100
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    name: "Battery SoC",
    value: 3.2,
    unit: "%",
    status: "alarm",
    alarmThreshold: 5,
    onChange: noop,
    min: 0,
    max: 100
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    name: "Rack-1 Cell-3",
    value: 3.72,
    unit: "V",
    tags: {
      rack_id: "1",
      cell: "3",
      zone: "A"
    },
    onChange: noop
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    name: "Disabled Input",
    value: 25,
    unit: "A",
    disabled: true,
    onChange: noop
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    name: "Setpoint",
    value: 65,
    unit: "%",
    showRangeBar: true,
    min: 0,
    max: 100,
    onChange: noop
  }
}`,...c.parameters?.docs?.source}}};var l=[`Nominal`,`Warning`,`Alarm`,`WithTags`,`Disabled`,`WithRangeBar`];export{a as Alarm,s as Disabled,r as Nominal,i as Warning,c as WithRangeBar,o as WithTags,l as __namedExportsOrder,t as default};