import"./iframe-DrtVitW-.js";import{t as e}from"./react-DTxVzI4v.js";import{t}from"./jsx-runtime-BCjoHjkc.js";import{T as n,d as r,h as i,l as a,s as o,u as s,y as c}from"./src-BT8ATze9.js";import{l,r as u}from"./factories-BcOE1qn6.js";var d=t();e(),a({Container:n,Graphics:i,Text:r,Sprite:c});var f={title:`Graphics/HvacUnit`,component:o,tags:[`autodocs`]},p=l(10,10,80,140),m={step:50},h={width:120,height:180,background:`#0f0f1a`},g=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(s,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(o,{hvac:u(`online`,`cooling`),pos:p,config:m})})}),_=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(s,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(o,{hvac:u(`online`,`warming`),pos:p,config:m})})}),v=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(s,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(o,{hvac:u(`offline`,`idle`),pos:p,config:m})})}),y=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(s,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(o,{hvac:u(`online`,`idle`),pos:p,config:m})})});g.__docgenInfo={description:``,methods:[],displayName:`OnlineCooling`},_.__docgenInfo={description:``,methods:[],displayName:`OnlineWarming`},v.__docgenInfo={description:``,methods:[],displayName:`Offline`},y.__docgenInfo={description:``,methods:[],displayName:`Idle`},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
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