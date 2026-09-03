import{t as e}from"./TelemetryGauge-DhV-UVSB.js";var t={title:`Core/TelemetryGauge`,component:e,tags:[`autodocs`],argTypes:{value:{control:`number`},label:{control:`text`},unit:{control:`text`},size:{control:`radio`,options:[`small`,`medium`,`large`]},variant:{control:`radio`,options:[`linear`,`circular`]},decimals:{control:`number`},theme:{control:`radio`,options:[`info`,`success`,`warning`,`error`,`purple`,`temp`]}}},n={args:{value:50,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`kW`,size:`medium`,variant:`linear`}},r={args:{value:75,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`%`,size:`medium`,variant:`circular`}},i={args:{value:42,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`°C`,size:`small`,variant:`linear`}},a={args:{value:220,min:0,max:300,label:`BSC-1 Sıcaklık`,unit:`V`,size:`large`,variant:`linear`}},o={args:{value:5,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`%`,size:`medium`,variant:`linear`}},s={args:{value:95,min:0,max:100,label:`BSC-1 Sıcaklık`,unit:`%`,size:`medium`,variant:`circular`}},c={args:{value:68,min:0,max:100,label:`SoC`,unit:`%`,size:`medium`,variant:`circular`,theme:`success`}},l={args:{value:72,min:0,max:100,label:`Yük`,unit:`%`,size:`medium`,variant:`circular`,theme:`warning`}},u={args:{value:88,min:0,max:100,label:`Alarm`,unit:``,size:`medium`,variant:`circular`,theme:`error`}},d={args:{value:45,min:0,max:100,label:`PCS Gücü`,unit:`kW`,size:`medium`,variant:`circular`,theme:`purple`}},f={args:{value:32,min:0,max:50,label:`Oda Sıcaklığı`,unit:`°C`,size:`medium`,variant:`circular`,theme:`temp`}},p={args:{value:60,min:0,max:100,label:`Nem`,unit:`%`,size:`medium`,variant:`linear`,theme:`warning`}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
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
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    value: 68,
    min: 0,
    max: 100,
    label: "SoC",
    unit: "%",
    size: "medium",
    variant: "circular",
    theme: "success"
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    value: 72,
    min: 0,
    max: 100,
    label: "Yük",
    unit: "%",
    size: "medium",
    variant: "circular",
    theme: "warning"
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    value: 88,
    min: 0,
    max: 100,
    label: "Alarm",
    unit: "",
    size: "medium",
    variant: "circular",
    theme: "error"
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    value: 45,
    min: 0,
    max: 100,
    label: "PCS Gücü",
    unit: "kW",
    size: "medium",
    variant: "circular",
    theme: "purple"
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    value: 32,
    min: 0,
    max: 50,
    label: "Oda Sıcaklığı",
    unit: "°C",
    size: "medium",
    variant: "circular",
    theme: "temp"
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    value: 60,
    min: 0,
    max: 100,
    label: "Nem",
    unit: "%",
    size: "medium",
    variant: "linear",
    theme: "warning"
  }
}`,...p.parameters?.docs?.source}}};var m=[`Linear50Percent`,`Circular75Percent`,`Small`,`Large`,`LowValue5Percent`,`HighValue95Percent`,`SuccessTheme`,`WarningTheme`,`ErrorTheme`,`PurpleTheme`,`TempTheme`,`LinearWarningTheme`];export{r as Circular75Percent,u as ErrorTheme,s as HighValue95Percent,a as Large,n as Linear50Percent,p as LinearWarningTheme,o as LowValue5Percent,d as PurpleTheme,i as Small,c as SuccessTheme,f as TempTheme,l as WarningTheme,m as __namedExportsOrder,t as default};