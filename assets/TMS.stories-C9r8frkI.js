import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{d as n}from"./factories-CCuBTyQA.js";import{t as r}from"./src-DmG_Kr-K.js";var i=t();e();var a={title:`Graphics/TMS`,component:r,tags:[`autodocs`]},o=[n({temp:22,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`warming`}]}),n({temp:25,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]}),n({temp:28,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]}),n({temp:30,hvacs:[{status:`online`,mode:`cooling`},{status:`online`,mode:`cooling`}]})],s=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(r,{rooms:o,panel_temp:32,status:`online`,width:800,bordered:!0,showRefresh:!1})}),c=[o[0],o[1],n({temp:28,hvacs:[{status:`offline`,mode:`idle`},{status:`offline`,mode:`idle`}]}),n({temp:30,hvacs:[{status:`online`,mode:`cooling`},{status:`offline`,mode:`idle`}]})],l=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(r,{rooms:c,panel_temp:25,status:`online`,width:800,bordered:!0,showRefresh:!1})}),u=[n({temp:18,hvacs:[{status:`online`,mode:`warming`},{status:`online`,mode:`warming`}]})],d=()=>(0,i.jsx)(`div`,{style:{width:820,background:`#0f0f1a`,borderRadius:8},children:(0,i.jsx)(r,{rooms:u,panel_temp:20,status:`online`,width:800,bordered:!0,showRefresh:!1})});s.__docgenInfo={description:``,methods:[],displayName:`AllOnline`},l.__docgenInfo={description:``,methods:[],displayName:`MixedStatus`},d.__docgenInfo={description:``,methods:[],displayName:`SingleRoom`},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`() => <div style={{
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