import"./iframe-BFedDYV-.js";import{t as e}from"./react-Dl7tAplA.js";import{t}from"./jsx-runtime-BJU0l6-K.js";import{t as n}from"./src-BFKpUvRB.js";import{d as r}from"./factories-Dm0sfm_r.js";var i=t();e();var a={title:`Graphics/TMS`,component:n,tags:[`autodocs`]},o=[r({temp:22,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`warming`}]}),r({temp:25,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]}),r({temp:28,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]}),r({temp:30,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]})],s=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{rooms:o,panel_temp:32,status:`online`,width:800,bordered:!0,showRefresh:!1})}),c=[o[0],o[1],r({temp:28,hvacs:[{status:`offline`,mode:`idle`},{status:`offline`,mode:`idle`}]}),r({temp:30,hvacs:[{status:`online`,mode:`cooling`},{status:`offline`,mode:`idle`}]})],l=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{rooms:c,panel_temp:25,status:`online`,width:800,bordered:!0,showRefresh:!1})}),u=[r({temp:18,hvacs:[{status:`online`,mode:`warming`},{status:`online`,mode:`warming`}]})],d=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(n,{rooms:u,panel_temp:20,status:`online`,width:800,bordered:!0,showRefresh:!1})});s.__docgenInfo={description:``,methods:[],displayName:`AllOnline`},l.__docgenInfo={description:``,methods:[],displayName:`MixedStatus`},d.__docgenInfo={description:``,methods:[],displayName:`SingleRoom`},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <TMS rooms={allOnlineRooms} panel_temp={32} status="online" width={800} bordered showRefresh={false} />
  </div>`,...s.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <TMS rooms={mixedRooms} panel_temp={25} status="online" width={800} bordered showRefresh={false} />
  </div>`,...l.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 820,
  background: "#0f0f1a",
  borderRadius: 8
}}>
    <TMS rooms={singleRoom} panel_temp={20} status="online" width={800} bordered showRefresh={false} />
  </div>`,...d.parameters?.docs?.source}}};var f=[`AllOnline`,`MixedStatus`,`SingleRoom`];export{s as AllOnline,l as MixedStatus,d as SingleRoom,f as __namedExportsOrder,a as default};