import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{t as n}from"./BESSDiagram-B2w1HzNn.js";var r=t();e();var i={title:`Graphics/BESSDiagram`,component:n,tags:[`autodocs`]},a=e=>({id:1,deviceId:`BESS-1`,name:`Rack-1`,status:`online`,charge_status:`Charge`,soc:50,soh:95,voltage:48,current:6,power_kw:.3,temperature:28,...e}),o=(e,t,n)=>({deviceId:e,racks:Array.from({length:8},(n,r)=>a({id:t+r,deviceId:e,name:`Rack-${t+r}`,status:r===7?`offline`:`online`,charge_status:r%3==0?`Discharge`:`Charge`,soc:90-r*9})),breakerStatus:`online`,breakerPosition:`close`,dcOutput:{status:`online`,voltage:48,current:12},systemSummary:n??{avgSoC:62,avgSoH:94,avgVoltage:48.1,avgCurrent:8.4,avgPower:.4,onlineRackCount:7,totalRackCount:8}}),s=Array.from({length:4},(e,t)=>({temp:21+t,humidity:45+t,setTemp:22,hvacs:[{status:`online`,mode:t%2==0?`cooling`:`warming`},{status:`online`,mode:`cooling`}]})),c=()=>(0,r.jsx)(`div`,{style:{width:1200,background:`#0f0f1a`,borderRadius:8},children:(0,r.jsx)(n,{bscUnits:[o(`BSC-1`,1),o(`BSC-2`,9)],flowDirection:`Charge`,hvacRooms:s,panelTemp:22,panelHumidity:48,energyAnalyzer:{voltage:391.2,current:148.7,power:58.2,energy:12345.6},firePanel:{fault:!1,fire:!1,firstStageAlarm:!1,secondStageAlarm:!1,discharged:!1,extract:!1,modeAuto:!0,hold:!1,abort:!1},width:1200,height:900})});c.__docgenInfo={description:``,methods:[],displayName:`Default`},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 1200,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <BESSDiagram bscUnits={[bscUnit("BSC-1", 1), bscUnit("BSC-2", 9)]} flowDirection="Charge" hvacRooms={hvacRooms as never} panelTemp={22} panelHumidity={48} energyAnalyzer={{
    voltage: 391.2,
    current: 148.7,
    power: 58.2,
    energy: 12345.6
  }} firePanel={{
    fault: false,
    fire: false,
    firstStageAlarm: false,
    secondStageAlarm: false,
    discharged: false,
    extract: false,
    modeAuto: true,
    hold: false,
    abort: false
  }} width={1200} height={900} />
  </div>`,...c.parameters?.docs?.source}}};var l=[`Default`];export{c as Default,l as __namedExportsOrder,i as default};