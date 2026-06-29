import{t as e}from"./MultiLineChart-IgeSuzcM.js";import{i as t,n}from"./factories-DiEsIEH4.js";var r={title:`Components/MultiLineChart`,component:e,tags:[`autodocs`],argTypes:{height:{control:`number`},showLegend:{control:`boolean`},isLoading:{control:`boolean`}}},i={args:{data:n(24,[`voltage`]),title:`Voltaj Geçmişi`,yAxisLabel:`Voltaj (V)`}},a=n(24,[`voltage`,`current`,`power`]),[o,s,c]=a,l={args:{data:a,title:`Çoklu Seri Grafiği`,yAxisLabel:`Değer`}},u={args:{data:a,title:`Anotasyonlu Grafik`,yAxisLabel:`Değer`,annotations:o&&s&&c?[t({type:`warning`,timestamp:o.timestamp,message:`Voltaj düşüşü`}),t({type:`error`,timestamp:s.timestamp,message:`Akım kesintisi`}),t({type:`info`,timestamp:c.timestamp,message:`Sistem normale döndü`})]:void 0}},d={args:{data:[],isLoading:!0}},f={args:{data:[]}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    data: createMockChartData(24, ["voltage"]),
    title: "Voltaj Geçmişi",
    yAxisLabel: "Voltaj (V)"
  }
}`,...i.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    data: multiSeriesData,
    title: "Çoklu Seri Grafiği",
    yAxisLabel: "Değer"
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    data: multiSeriesData,
    title: "Anotasyonlu Grafik",
    yAxisLabel: "Değer",
    annotations: ann1 && ann2 && ann3 ? [createMockLogEntry({
      type: "warning",
      timestamp: ann1.timestamp,
      message: "Voltaj düşüşü"
    }), createMockLogEntry({
      type: "error",
      timestamp: ann2.timestamp,
      message: "Akım kesintisi"
    }), createMockLogEntry({
      type: "info",
      timestamp: ann3.timestamp,
      message: "Sistem normale döndü"
    })] : undefined
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    data: [],
    isLoading: true
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    data: []
  }
}`,...f.parameters?.docs?.source}}};var p=[`SingleSeries`,`MultiSeries`,`WithAnnotations`,`Loading`,`NoData`];export{d as Loading,l as MultiSeries,f as NoData,i as SingleSeries,u as WithAnnotations,p as __namedExportsOrder,r as default};