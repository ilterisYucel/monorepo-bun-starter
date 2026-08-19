import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-DJBc3-Sk.js";import{n as i}from"./CanvasRenderer-BW_IhNuC.js";import{t as a}from"./SpriteTextureProvider-CMLAl3XL.js";import{n as o,r as s,t as c}from"./lib-yE4Adh3N.js";import{t as l}from"./textures-M_6d12p_.js";import{n as u,t as d}from"./GridSymbol-Co12hG_t.js";var f=t();e(),c({Container:r,Graphics:i,Text:s,Sprite:n});var p={title:`Graphics/GridSymbol`,component:d,tags:[`autodocs`]},m={step:40},h={width:120,height:100,background:`#0f0f1a`},g=()=>(0,f.jsx)(`div`,{style:{width:84,height:60},children:(0,f.jsx)(o,{width:84,height:60,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,f.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),u(e,6,6,72,48,m.step)}})})});g.parameters={backgrounds:{default:`transparent`}};var _=()=>(0,f.jsx)(`div`,{style:h,children:(0,f.jsx)(o,{width:120,height:100,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{x:24,y:26,width:72,height:48,config:m})})}),v=()=>(0,f.jsx)(`div`,{style:h,children:(0,f.jsx)(o,{width:120,height:100,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(a,{assets:l,children:(0,f.jsx)(d,{x:24,y:26,width:72,height:48,config:m})})})});g.__docgenInfo={description:``,methods:[],displayName:`Base`},_.__docgenInfo={description:``,methods:[],displayName:`Normal`},v.__docgenInfo={description:``,methods:[],displayName:`SpriteMode`},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 84,
  height: 60
}}>
    <Application width={84} height={60} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      drawGridChassis(g, 6, 6, 72, 48, config.step);
    }} />
    </Application>
  </div>`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={100} background={0x0f0f1a} antialias={false} resolution={1}>
      <GridSymbol x={24} y={26} width={72} height={48} config={config} />
    </Application>
  </div>`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={100} background={0x0f0f1a} antialias={false} resolution={1}>
      <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <GridSymbol x={24} y={26} width={72} height={48} config={config} />
      </SpriteTextureProvider>
    </Application>
  </div>`,...v.parameters?.docs?.source}}};var y=[`Base`,`Normal`,`SpriteMode`];export{g as Base,_ as Normal,v as SpriteMode,y as __namedExportsOrder,p as default};