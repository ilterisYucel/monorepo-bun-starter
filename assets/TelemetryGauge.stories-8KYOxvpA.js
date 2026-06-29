import{t as e}from"./TelemetryGauge-CtvTpasw.js";var t={title:`Core/TelemetryGauge`,component:e,tags:[`autodocs`],argTypes:{value:{control:`number`},label:{control:`text`},unit:{control:`text`},size:{control:`radio`,options:[`small`,`medium`,`large`]},variant:{control:`radio`,options:[`linear`,`circular`]},decimals:{control:`number`}}},n={args:{value:50,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`kW`,size:`medium`,variant:`linear`}},r={args:{value:75,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`%`,size:`medium`,variant:`circular`}},i={args:{value:42,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`°C`,size:`small`,variant:`linear`}},a={args:{value:220,min:0,max:300,label:`BSC-1 Sıcaklık`,unit:`V`,size:`large`,variant:`linear`}},o={args:{value:5,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`%`,size:`medium`,variant:`linear`}},s={args:{value:95,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`%`,size:`medium`,variant:`circular`}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    value: 50.0,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "kW",
    size: "medium",
    variant: "linear"
  }
}`,...n.parameters?.docs?.source}}},r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    value: 75.0,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "%",
    size: "medium",
    variant: "circular"
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    value: 42,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "°C",
    size: "small",
    variant: "linear"
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    value: 220,
    min: 0,
    max: 300,
    label: "BSC-1 Sıcaklık",
    unit: "V",
    size: "large",
    variant: "linear"
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    value: 5,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "%",
    size: "medium",
    variant: "linear"
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    value: 95,
    min: 0,
    max: 100,
    label: "BSC-1 Sıcaklık",
    unit: "%",
    size: "medium",
    variant: "circular"
  }
}`,...s.parameters?.docs?.source}}};var c=[`Linear50Percent`,`Circular75Percent`,`Small`,`Large`,`LowValue5Percent`,`HighValue95Percent`];export{r as Circular75Percent,s as HighValue95Percent,a as Large,n as Linear50Percent,o as LowValue5Percent,i as Small,c as __namedExportsOrder,t as default};