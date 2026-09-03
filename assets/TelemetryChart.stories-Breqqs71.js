import{s as e,v as t,y as n}from"./factories-9e-l2P_s.js";import{t as r}from"./TelemetryChart-DEaIBFFP.js";var i={title:`Components/TelemetryChart`,component:r,tags:[`autodocs`]},a=[`Voltage`,`Current`,`Power`,`Temperature`],o=t(a),s={args:{provider:n(o),telemetryNames:a,title:`BSC-1 Telemetrisi`,yAxisLabel:`Değer`}},c={args:{provider:n(t([`Voltage`]),{selectedName:`Voltage`}),telemetryNames:[`Voltage`],title:`Voltaj Geçmişi`,yAxisLabel:`Volt (V)`,defaultMetric:`Voltage`}},l={args:{provider:n([],{isLoading:!0}),telemetryNames:a,title:`Yükleniyor...`}},u={args:{provider:n([],{isError:!0,error:new u(`Backend zaman aşımı`)}),telemetryNames:a,title:`Hata Durumu`}},d={args:{provider:n(o),telemetryNames:a,title:`Olay Anotasyonlu`,eventAnnotations:{logs:[e({message:`Şarj başladı`})],isLoading:!1,isError:!1,error:null,refetch:()=>{}}}},f={args:{provider:n(o),telemetryNames:a,title:`Tag Filtreli`,tagFilters:[{tagKey:`rackId`,label:`Raf`},{tagKey:`deviceId`,label:`Cihaz`}]}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider(data),
    telemetryNames: names,
    title: "BSC-1 Telemetrisi",
    yAxisLabel: "Değer"
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider(createMockTelemetryData(["Voltage"]), {
      selectedName: "Voltage"
    }),
    telemetryNames: ["Voltage"],
    title: "Voltaj Geçmişi",
    yAxisLabel: "Volt (V)",
    defaultMetric: "Voltage"
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider([], {
      isLoading: true
    }),
    telemetryNames: names,
    title: "Yükleniyor..."
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider([], {
      isError: true,
      error: new Error("Backend zaman aşımı")
    }),
    telemetryNames: names,
    title: "Hata Durumu"
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider(data),
    telemetryNames: names,
    title: "Olay Anotasyonlu",
    eventAnnotations: {
      logs: [createMockLogEntry({
        message: "Şarj başladı"
      })],
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => {}
    }
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockTelemetryProvider(data),
    telemetryNames: names,
    title: "Tag Filtreli",
    tagFilters: [{
      tagKey: "rackId",
      label: "Raf"
    }, {
      tagKey: "deviceId",
      label: "Cihaz"
    }]
  }
}`,...f.parameters?.docs?.source}}};var p=[`Default`,`SingleMetric`,`Loading`,`Error`,`WithEventAnnotations`,`WithTagFilters`];export{s as Default,u as Error,l as Loading,c as SingleMetric,d as WithEventAnnotations,f as WithTagFilters,p as __namedExportsOrder,i as default};