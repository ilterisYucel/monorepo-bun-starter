import{n as e,s as t}from"./factories-9e-l2P_s.js";import{t as n}from"./MultiLineChartV2-Do76LRXu.js";var r={title:`Components/MultiLineChartV2`,component:n,tags:[`autodocs`]},i=e(60,[`Voltage`]),a={args:{data:i,title:`Voltaj Geçmişi`,yAxisLabel:`Volt (V)`}},o={args:{data:e(60,[`Voltage`,`Current`,`Power`]),title:`Çoklu Seri`}},s={args:{data:i,title:`Anotasyonlu Grafik`,annotations:[t({message:`Şarj başladı`})]}},c={args:{data:[],title:`Yükleniyor...`,isLoading:!0}},l={args:{data:[],title:`Veri Yok`}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    data: singleSeries,
    title: "Voltaj Geçmişi",
    yAxisLabel: "Volt (V)"
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    data: createMockChartData(60, ["Voltage", "Current", "Power"]),
    title: "Çoklu Seri"
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    data: singleSeries,
    title: "Anotasyonlu Grafik",
    annotations: [createMockLogEntry({
      message: "Şarj başladı"
    })]
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    data: [],
    title: "Yükleniyor...",
    isLoading: true
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    data: [],
    title: "Veri Yok"
  }
}`,...l.parameters?.docs?.source}}};var u=[`SingleSeries`,`MultiSeries`,`WithAnnotations`,`Loading`,`NoData`];export{c as Loading,o as MultiSeries,l as NoData,a as SingleSeries,s as WithAnnotations,u as __namedExportsOrder,r as default};