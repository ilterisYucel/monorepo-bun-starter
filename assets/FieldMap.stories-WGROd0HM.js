import{t as e}from"./FieldMap-ClkDu39o.js";var t={title:`Components/FieldMap`,component:e,tags:[`autodocs`]},n=[{id:`field-1`,name:`Solar Park 1`,lat:38.4,lng:27.1,status:`online`,containerCount:4,onlineContainerCount:4,totalPowerMw:12.4,avgSoc:82},{id:`field-2`,name:`Wind Site 2`,lat:39.9,lng:32.8,status:`warning`,containerCount:4,onlineContainerCount:3,totalPowerMw:8.1,avgSoc:65,activeAlarms:2},{id:`field-3`,name:`Demo Site 3`,lat:41,lng:28.9,status:`offline`,containerCount:2,onlineContainerCount:0}],r={args:{fields:n,height:420}},i={args:{fields:n,selectedFieldId:`field-1`,height:420}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    fields,
    height: 420
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    fields,
    selectedFieldId: "field-1",
    height: 420
  }
}`,...i.parameters?.docs?.source}}};var a=[`Default`,`Selected`];export{r as Default,i as Selected,a as __namedExportsOrder,t as default};