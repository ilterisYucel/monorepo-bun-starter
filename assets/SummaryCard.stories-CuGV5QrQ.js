import{t as e}from"./jsx-runtime-DKdBMi_L.js";import{t}from"./nav-icons-NPvNTbiq.js";import{t as n}from"./SummaryCard-fB2d2JTj.js";var r=e(),i={title:`Components/SummaryCard`,component:n,tags:[`autodocs`]},a={args:{icon:(0,r.jsx)(t.dashboard,{size:18}),value:`52.1 V`,label:`DC Voltaj`,variant:`ok`}},o={args:{icon:(0,r.jsx)(t.temperature,{size:18}),value:`34 °C`,label:`Sıcaklık`,variant:`alarm`}},s={args:{icon:(0,r.jsx)(t.close,{size:18}),value:`0 A`,label:`Akım`,variant:`fault`}},c={args:{icon:(0,r.jsx)(t.logInfo,{size:18}),value:`96%`,label:`SoH`,variant:`info`}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.dashboard size={18} />,
    value: "52.1 V",
    label: "DC Voltaj",
    variant: "ok"
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.temperature size={18} />,
    value: "34 °C",
    label: "Sıcaklık",
    variant: "alarm"
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.close size={18} />,
    value: "0 A",
    label: "Akım",
    variant: "fault"
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.logInfo size={18} />,
    value: "96%",
    label: "SoH",
    variant: "info"
  }
}`,...c.parameters?.docs?.source}}};var l=[`Ok`,`Alarm`,`Fault`,`Info`];export{o as Alarm,s as Fault,c as Info,a as Ok,l as __namedExportsOrder,i as default};