import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-V7s6uY3x.js";import{n as i}from"./CanvasRenderer-C8mbTmot.js";import"./lib-BWUuX8Sy.js";import{n as a,r as o,t as s}from"./lib-xY3v-sQ6.js";import{m as c}from"./factories-9e-l2P_s.js";import"./src-BV1oujNP.js";import{n as l,t as u}from"./elements-D_0KpL2L.js";var d=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var f={title:`Graphics/PanelCard`,component:u,tags:[`autodocs`]},p=c(10,10,60,100),m={step:50},h={width:100,height:140,background:`#0f0f1a`},g=()=>(0,d.jsx)(`div`,{style:{width:72,height:112},children:(0,d.jsx)(a,{width:72,height:112,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,d.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),l(e,{x:6,y:6,width:60,height:100},{step:15})}})})});g.parameters={backgrounds:{default:`transparent`}};var _=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(a,{width:100,height:140,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(u,{pos:p,panelTemp:5,config:m})})}),v=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(a,{width:100,height:140,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(u,{pos:p,panelTemp:22,config:m})})}),y=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(a,{width:100,height:140,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(u,{pos:p,panelTemp:40,config:m})})});g.__docgenInfo={description:``,methods:[],displayName:`Base`},_.__docgenInfo={description:``,methods:[],displayName:`Cold`},v.__docgenInfo={description:``,methods:[],displayName:`Normal`},y.__docgenInfo={description:``,methods:[],displayName:`Hot`},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 72,
  height: 112
}}>
    <Application width={72} height={112} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      const baseStep = {
        step: 15
      };
      const basePos = {
        x: 6,
        y: 6,
        width: 60,
        height: 100
      };
      // Frame-only: AI yalnızca dış çerçeveyi üretsin — termometre kod tarafında
      drawPanelBody(g, basePos, baseStep);
    }} />
    </Application>
  </div>`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={100} height={140} background={0x0f0f1a} antialias={false} resolution={1}>
      <PanelCard pos={pos} panelTemp={5} config={config} />
    </Application>
  </div>`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={100} height={140} background={0x0f0f1a} antialias={false} resolution={1}>
      <PanelCard pos={pos} panelTemp={22} config={config} />
    </Application>
  </div>`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={100} height={140} background={0x0f0f1a} antialias={false} resolution={1}>
      <PanelCard pos={pos} panelTemp={40} config={config} />
    </Application>
  </div>`,...y.parameters?.docs?.source}}};var b=[`Base`,`Cold`,`Normal`,`Hot`];export{g as Base,_ as Cold,y as Hot,v as Normal,b as __namedExportsOrder,f as default};