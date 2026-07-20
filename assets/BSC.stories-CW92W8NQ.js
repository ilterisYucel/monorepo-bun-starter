import"./iframe-BN3XbMSJ.js";import{t as e}from"./react-D4CrgfyT.js";import{t}from"./jsx-runtime-0piXhLHj.js";import{n}from"./src-XiiGd4j3.js";import{t as r}from"./factories-Dm0sfm_r.js";var i=t();e();var a={title:`Graphics/BSC`,component:n,tags:[`autodocs`]},o=e=>({id:1,deviceId:`BSC-1`,name:`Rack-1`,status:`online`,charge_status:`Charge`,soc:50,soh:95,voltage:48,current:6,power_kw:.3,temperature:28,...e}),s=r({deviceId:`BSC-1`,racks:[o({id:1,name:`Rack-1`,status:`online`,charge_status:`Charge`,soc:85}),o({id:2,name:`Rack-2`,status:`online`,charge_status:`Charge`,soc:72}),o({id:3,name:`Rack-3`,status:`online`,charge_status:`Discharge`,soc:38}),o({id:4,name:`Rack-4`,status:`offline`,charge_status:`Idle`,soc:0})],breakerStatus:`online`,breakerPosition:`close`,dcOutput:{status:`online`,voltage:48,current:12}}),c=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{deviceId:`BSC-1`,bscUnits:[s],flowDirection:`Charge`,width:800,bordered:!0,showRefresh:!1})}),l=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{deviceId:`BSC-1`,bscUnits:[s],flowDirection:`Discharge`,width:800,bordered:!0,showRefresh:!1})}),u=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{deviceId:`BSC-1`,bscUnits:[s],flowDirection:`Idle`,width:800,bordered:!0,showRefresh:!1})}),d=r({deviceId:`BSC-2`,racks:[o({id:5,deviceId:`BSC-2`,name:`Rack-5`,status:`online`,charge_status:`Charge`,soc:92}),o({id:6,deviceId:`BSC-2`,name:`Rack-6`,status:`online`,charge_status:`Discharge`,soc:45}),o({id:7,deviceId:`BSC-2`,name:`Rack-7`,status:`offline`,charge_status:`Idle`,soc:0}),o({id:8,deviceId:`BSC-2`,name:`Rack-8`,status:`online`,charge_status:`Charge`,soc:61})],breakerStatus:`online`,breakerPosition:`close`,dcOutput:{status:`online`,voltage:48,current:8}}),f=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{deviceId:`BSC-FARM`,bscUnits:[s,d],flowDirection:`Charge`,width:800,bordered:!0,showRefresh:!1})});c.__docgenInfo={description:``,methods:[],displayName:`ChargeMode`},l.__docgenInfo={description:``,methods:[],displayName:`DischargeMode`},u.__docgenInfo={description:``,methods:[],displayName:`IdleMode`},f.__docgenInfo={description:``,methods:[],displayName:`TwoBSCUnits`},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <BSC deviceId="BSC-1" bscUnits={[chargeUnit]} flowDirection="Charge" width={800} bordered showRefresh={false} />
  </div>`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <BSC deviceId="BSC-1" bscUnits={[chargeUnit]} flowDirection="Discharge" width={800} bordered showRefresh={false} />
  </div>`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <BSC deviceId="BSC-1" bscUnits={[chargeUnit]} flowDirection="Idle" width={800} bordered showRefresh={false} />
  </div>`,...u.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <BSC deviceId="BSC-FARM" bscUnits={[chargeUnit, unit2]} flowDirection="Charge" width={800} bordered showRefresh={false} />
  </div>`,...f.parameters?.docs?.source}}};var p=[`ChargeMode`,`DischargeMode`,`IdleMode`,`TwoBSCUnits`];export{c as ChargeMode,l as DischargeMode,u as IdleMode,f as TwoBSCUnits,p as __namedExportsOrder,a as default};