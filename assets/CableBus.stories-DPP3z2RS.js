import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-DJBc3-Sk.js";import{n as i}from"./CanvasRenderer-BW_IhNuC.js";import"./SpriteTextureProvider-CMLAl3XL.js";import{n as a,r as o,t as s}from"./lib-yE4Adh3N.js";import{t as c}from"./CableBus-CvFnkdFN.js";var l=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var u={title:`Graphics/CableBus`,component:c,tags:[`autodocs`]},d={width:600,height:260,background:`#0f0f1a`},f={racks:[{id:1,x:140,y:100},{id:2,x:300,y:100}],topBusY:70,bottomBusY:200,convergenceX:500,cbLeftMid:{x:430,y:135}},p=()=>(0,l.jsx)(`div`,{style:d,children:(0,l.jsx)(a,{width:600,height:260,background:986906,antialias:!1,resolution:1,children:(0,l.jsx)(c,{config:{rackWidth:120,rackHeight:120,step:20},positions:f,flowDirection:`idle`})})}),m=()=>(0,l.jsx)(`div`,{style:d,children:(0,l.jsx)(a,{width:600,height:260,background:986906,antialias:!1,resolution:1,children:(0,l.jsx)(c,{config:{rackWidth:120,rackHeight:120,step:20},positions:f,flowDirection:`charge`})})}),h=()=>(0,l.jsx)(`div`,{style:d,children:(0,l.jsx)(a,{width:600,height:260,background:986906,antialias:!1,resolution:1,children:(0,l.jsx)(c,{config:{rackWidth:120,rackHeight:120,step:20},positions:f,flowDirection:`discharge`})})});p.__docgenInfo={description:``,methods:[],displayName:`Idle`},m.__docgenInfo={description:``,methods:[],displayName:`Charging`},h.__docgenInfo={description:``,methods:[],displayName:`Discharging`},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={600} height={260} background={0x0f0f1a} antialias={false} resolution={1}>
      <CableBus config={{
      rackWidth: 120,
      rackHeight: 120,
      step: 20
    }} positions={positions} flowDirection="idle" />
    </Application>
  </div>`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={600} height={260} background={0x0f0f1a} antialias={false} resolution={1}>
      <CableBus config={{
      rackWidth: 120,
      rackHeight: 120,
      step: 20
    }} positions={positions} flowDirection="charge" />
    </Application>
  </div>`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={600} height={260} background={0x0f0f1a} antialias={false} resolution={1}>
      <CableBus config={{
      rackWidth: 120,
      rackHeight: 120,
      step: 20
    }} positions={positions} flowDirection="discharge" />
    </Application>
  </div>`,...h.parameters?.docs?.source}}};var g=[`Idle`,`Charging`,`Discharging`];export{m as Charging,h as Discharging,p as Idle,g as __namedExportsOrder,u as default};