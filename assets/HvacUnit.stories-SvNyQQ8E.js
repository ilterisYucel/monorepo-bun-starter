import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{S as n,g as r}from"./Geometry-DsFOYoGD.js";import{n as i}from"./CanvasRenderer-CSK-Cc-P.js";import{d as a,l as o,s,u as c}from"./src-C656tMTz.js";import{l,r as u}from"./factories-CCuBTyQA.js";var d=t();e(),o({Container:n,Graphics:i,Text:a,Sprite:r});var f={title:`Graphics/HvacUnit`,component:s,tags:[`autodocs`]},p=l(10,10,80,140),m={step:50},h={width:120,height:180,background:`#0f0f1a`},g=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(c,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(s,{hvac:u(`online`,`cooling`),pos:p,config:m})})}),_=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(c,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(s,{hvac:u(`online`,`warming`),pos:p,config:m})})}),v=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(c,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(s,{hvac:u(`offline`,`idle`),pos:p,config:m})})}),y=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(c,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(s,{hvac:u(`online`,`idle`),pos:p,config:m})})});g.__docgenInfo={description:``,methods:[],displayName:`OnlineCooling`},_.__docgenInfo={description:``,methods:[],displayName:`OnlineWarming`},v.__docgenInfo={description:``,methods:[],displayName:`Offline`},y.__docgenInfo={description:``,methods:[],displayName:`Idle`},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "cooling")} pos={pos} config={config} />
    </Application>
  </div>`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "warming")} pos={pos} config={config} />
    </Application>
  </div>`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("offline", "idle")} pos={pos} config={config} />
    </Application>
  </div>`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "idle")} pos={pos} config={config} />
    </Application>
  </div>`,...y.parameters?.docs?.source}}};var b=[`OnlineCooling`,`OnlineWarming`,`Offline`,`Idle`];export{y as Idle,v as Offline,g as OnlineCooling,_ as OnlineWarming,b as __namedExportsOrder,f as default};