import"./iframe-BN3XbMSJ.js";import{t as e}from"./react-D4CrgfyT.js";import{t}from"./jsx-runtime-0piXhLHj.js";import{T as n,d as r,h as i,i as a,l as o,u as s,y as c}from"./src-XiiGd4j3.js";import{o as l}from"./factories-Dm0sfm_r.js";var u=t();e(),o({Container:n,Graphics:i,Text:r,Sprite:c});var d={title:`Graphics/DCOutput`,component:a,tags:[`autodocs`]},f={step:30},p=l(50,50,30),m={width:120,height:120,background:`#0f0f1a`},h=()=>(0,u.jsx)(`div`,{style:m,children:(0,u.jsx)(s,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,u.jsx)(a,{config:f,output:p,dcOutput:{status:`online`,voltage:48,current:12.5}})})}),g=()=>(0,u.jsx)(`div`,{style:m,children:(0,u.jsx)(s,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,u.jsx)(a,{config:f,output:p,dcOutput:{status:`offline`,voltage:0,current:0}})})}),_=()=>(0,u.jsx)(`div`,{style:m,children:(0,u.jsx)(s,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,u.jsx)(a,{config:f,output:p})})});h.__docgenInfo={description:``,methods:[],displayName:`Active`},g.__docgenInfo={description:``,methods:[],displayName:`Idle`},_.__docgenInfo={description:``,methods:[],displayName:`NoDcOutput`},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} dcOutput={{
      status: "online",
      voltage: 48.0,
      current: 12.5
    }} />
    </Application>
  </div>`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} dcOutput={{
      status: "offline",
      voltage: 0,
      current: 0
    }} />
    </Application>
  </div>`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} />
    </Application>
  </div>`,..._.parameters?.docs?.source}}};var v=[`Active`,`Idle`,`NoDcOutput`];export{h as Active,g as Idle,_ as NoDcOutput,v as __namedExportsOrder,d as default};