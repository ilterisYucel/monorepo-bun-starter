import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-V7s6uY3x.js";import{n as i}from"./CanvasRenderer-C8mbTmot.js";import"./lib-BWUuX8Sy.js";import{n as a,r as o,t as s}from"./lib-xY3v-sQ6.js";import{t as c}from"./SpriteTextureProvider-CbxKmb-s.js";import"./SpriteTextureProvider-CJNNbxkx.js";import{t as l}from"./textures-M_6d12p_.js";import{d as u}from"./factories-9e-l2P_s.js";import"./src-BV1oujNP.js";import{n as d,t as f}from"./DCOutput-vIOt7crY.js";var p=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var m={title:`Graphics/DCOutput`,component:f,tags:[`autodocs`]},h={step:30},g=u(50,50,30),_={width:120,height:120,background:`#0f0f1a`},v=()=>(0,p.jsx)(`div`,{style:{width:100,height:112},children:(0,p.jsx)(a,{width:100,height:112,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,p.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),d(e,h,{x:50,y:46,radius:30})}})})});v.parameters={backgrounds:{default:`transparent`}};var y=()=>(0,p.jsx)(`div`,{style:_,children:(0,p.jsx)(a,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,p.jsx)(c,{assets:l,children:(0,p.jsx)(f,{config:h,output:g,dcOutput:{status:`online`,voltage:48,current:12.5}})})})}),b=()=>(0,p.jsx)(`div`,{style:_,children:(0,p.jsx)(a,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,p.jsx)(f,{config:h,output:g,dcOutput:{status:`online`,voltage:48,current:12.5}})})}),x=()=>(0,p.jsx)(`div`,{style:_,children:(0,p.jsx)(a,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,p.jsx)(f,{config:h,output:g,dcOutput:{status:`offline`,voltage:0,current:0}})})}),S=()=>(0,p.jsx)(`div`,{style:_,children:(0,p.jsx)(a,{width:120,height:120,background:986906,antialias:!1,resolution:1,children:(0,p.jsx)(f,{config:h,output:g})})});v.__docgenInfo={description:``,methods:[],displayName:`Base`},y.__docgenInfo={description:``,methods:[],displayName:`SpriteMode`},b.__docgenInfo={description:``,methods:[],displayName:`Active`},x.__docgenInfo={description:``,methods:[],displayName:`Idle`},S.__docgenInfo={description:``,methods:[],displayName:`NoDcOutput`},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 100,
  height: 112
}}>
    <Application width={100} height={112} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      drawOutputChassis(g, config, {
        x: 50,
        y: 46,
        radius: 30
      });
    }} />
    </Application>
  </div>`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <DCOutput config={config} output={output} dcOutput={{
        status: "online",
        voltage: 48.0,
        current: 12.5
      }} />
      </SpriteTextureProvider>
    </Application>
  </div>`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} dcOutput={{
      status: "online",
      voltage: 48.0,
      current: 12.5
    }} />
    </Application>
  </div>`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} dcOutput={{
      status: "offline",
      voltage: 0,
      current: 0
    }} />
    </Application>
  </div>`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} />
    </Application>
  </div>`,...S.parameters?.docs?.source}}};var C=[`Base`,`SpriteMode`,`Active`,`Idle`,`NoDcOutput`];export{b as Active,v as Base,x as Idle,S as NoDcOutput,y as SpriteMode,C as __namedExportsOrder,m as default};