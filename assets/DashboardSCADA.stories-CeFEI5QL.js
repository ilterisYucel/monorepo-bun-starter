import{t as e}from"./factories-9e-l2P_s.js";import{t}from"./DashboardSCADA-GfRp5quI.js";var n={title:`Graphics/DashboardSCADA`,component:t,tags:[`autodocs`]},r=e({deviceId:`BSC-1`,racks:Array.from({length:8},(e,t)=>({id:t+1,deviceId:`BSC-1`,name:`Rack-${t+1}`,status:t===3?`offline`:`online`,charge_status:`Charge`,soc:t===3?0:40+t*6,voltage:48,current:6,power_kw:.3,temperature:28}))}),i=[{temp:24.1,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]},{temp:27.8,hvacs:[{status:`online`,mode:`cooling`}]}],a={args:{bscUnits:[r],flowDirection:`Charge`,hvacRooms:i,panelTemp:26.5,panelHumidity:48,energyFrequency:50.02,energyTotalPower:356,energyDelivered:1240.5,fireAlarmActive:!1,fireFaultActive:!1,width:1200}},o={args:{bscUnits:[r],flowDirection:`Idle`,hvacRooms:i,panelTemp:31.2,energyFrequency:50.02,energyTotalPower:0,fireAlarmActive:!0,fireFaultActive:!1,width:1200}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    bscUnits: [bscUnit],
    flowDirection: "Charge",
    hvacRooms: rooms,
    panelTemp: 26.5,
    panelHumidity: 48,
    energyFrequency: 50.02,
    energyTotalPower: 356,
    energyDelivered: 1240.5,
    fireAlarmActive: false,
    fireFaultActive: false,
    width: 1200
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    bscUnits: [bscUnit],
    flowDirection: "Idle",
    hvacRooms: rooms,
    panelTemp: 31.2,
    energyFrequency: 50.02,
    energyTotalPower: 0,
    fireAlarmActive: true,
    fireFaultActive: false,
    width: 1200
  }
}`,...o.parameters?.docs?.source}}};var s=[`Default`,`FireAlarm`];export{a as Default,o as FireAlarm,s as __namedExportsOrder,n as default};