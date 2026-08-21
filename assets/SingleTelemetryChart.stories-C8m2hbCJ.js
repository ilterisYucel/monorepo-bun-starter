import{v as e,y as t}from"./factories-9e-l2P_s.js";import{t as n}from"./SingleTelemetryChart-C-jXrj9L.js";var r={title:`Components/SingleTelemetryChart`,component:n,tags:[`autodocs`]},i={args:{provider:t(e([`Voltage`])),telemetryNames:[`Voltage`],title:`Voltaj`,yAxisLabel:`V`}},a={args:{provider:t(e([`Current`])),telemetryNames:[`Current`],title:`Akım`,yAxisLabel:`A`,height:480}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider(createMockTelemetryData(["Voltage"])),
    telemetryNames: ["Voltage"],
    title: "Voltaj",
    yAxisLabel: "V"
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider(createMockTelemetryData(["Current"])),
    telemetryNames: ["Current"],
    title: "Akım",
    yAxisLabel: "A",
    height: 480
  }
}`,...a.parameters?.docs?.source}}};var o=[`Default`,`Tall`];export{i as Default,a as Tall,o as __namedExportsOrder,r as default};