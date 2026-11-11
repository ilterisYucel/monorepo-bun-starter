import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{n}from"./tokens-CTJm1Bh4.js";import{t as r}from"./nav-icons-C4xSIWo6.js";import"./icons-CwPlL2ht.js";import"./colors-D5C2JSQ7.js";import{t as i}from"./emotion-styled.browser.esm-o9TBTxhU.js";e();var a=t(),o={ok:{border:n.success,bg:n.successAlpha12,text:n.success},alarm:{border:n.error,bg:n.errorAlpha12,text:n.error},fault:{border:n.warning,bg:n.warningAlpha12,text:n.warning},info:{border:n.info,bg:n.infoAlpha12,text:n.info},bsc:{border:n.success,bg:n.successAlpha12,text:n.success},cb:{border:n.info,bg:n.infoAlpha12,text:n.info},dc:{border:n.warning,bg:n.warningAlpha12,text:n.warning},hvac:{border:n.tempCold,bg:n.infoAlpha12,text:n.tempCold}},s=i(`div`,{target:`e1gmh3r20`})(`padding:18px;border-radius:14px;text-align:center;border:2px solid `,({$variant:e})=>o[e].border,`;background:`,({$variant:e})=>o[e].bg,`;transition:all 0.3s ease;`),c=i(`div`,{target:`e1gmh3r21`})(`font-size:32px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:inherit;`),l=i(`div`,{target:`e1gmh3r22`})(`font-size:22px;font-weight:800;color:`,({$variant:e})=>o[e].text,`;`),u=i(`div`,{target:`e1gmh3r23`})(`font-size:13px;font-weight:600;color:`,({$variant:e})=>o[e].text,`;`),d=({icon:e,value:t,label:n,variant:r})=>(0,a.jsxs)(s,{$variant:r,children:[(0,a.jsx)(c,{children:e}),(0,a.jsx)(l,{$variant:r,children:t}),(0,a.jsx)(u,{$variant:r,children:n})]});d.displayName=`SummaryCard`,d.__docgenInfo={description:``,methods:[],displayName:`SummaryCard`,props:{icon:{required:!0,tsType:{name:`ReactNode`},description:``},value:{required:!0,tsType:{name:`string`},description:``},label:{required:!0,tsType:{name:`string`},description:``},variant:{required:!0,tsType:{name:`union`,raw:`"ok" | "alarm" | "fault" | "info" | "bsc" | "cb" | "dc" | "hvac"`,elements:[{name:`literal`,value:`"ok"`},{name:`literal`,value:`"alarm"`},{name:`literal`,value:`"fault"`},{name:`literal`,value:`"info"`},{name:`literal`,value:`"bsc"`},{name:`literal`,value:`"cb"`},{name:`literal`,value:`"dc"`},{name:`literal`,value:`"hvac"`}]},description:``}}};var f={title:`Components/SummaryCard`,component:d,tags:[`autodocs`]},p={args:{icon:(0,a.jsx)(r.dashboard,{size:18}),value:`52.1 V`,label:`DC Voltaj`,variant:`ok`}},m={args:{icon:(0,a.jsx)(r.temperature,{size:18}),value:`34 °C`,label:`Sıcaklık`,variant:`alarm`}},h={args:{icon:(0,a.jsx)(r.close,{size:18}),value:`0 A`,label:`Akım`,variant:`fault`}},g={args:{icon:(0,a.jsx)(r.logInfo,{size:18}),value:`96%`,label:`SoH`,variant:`info`}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.dashboard size={18} />,
    value: "52.1 V",
    label: "DC Voltaj",
    variant: "ok"
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.temperature size={18} />,
    value: "34 °C",
    label: "Sıcaklık",
    variant: "alarm"
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.close size={18} />,
    value: "0 A",
    label: "Akım",
    variant: "fault"
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    icon: <SCADA_ICONS.logInfo size={18} />,
    value: "96%",
    label: "SoH",
    variant: "info"
  }
}`,...g.parameters?.docs?.source}}};var _=[`Ok`,`Alarm`,`Fault`,`Info`];export{m as Alarm,h as Fault,g as Info,p as Ok,_ as __namedExportsOrder,f as default};