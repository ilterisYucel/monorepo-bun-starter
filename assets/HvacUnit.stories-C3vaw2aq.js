import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-DJBc3-Sk.js";import{n as i}from"./CanvasRenderer-BW_IhNuC.js";import"./lib-UjwKfymy.js";import{n as a,r as o,t as s}from"./lib-CCbCMYPM.js";import{m as c,o as l}from"./factories-9e-l2P_s.js";import"./src-X1gPnTi1.js";import{i as u,r as d}from"./elements-BRQZ8HFP.js";var f=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var p={title:`Graphics/HvacUnit`,component:d,tags:[`autodocs`]},m=c(10,10,80,140),h={step:50},g={width:120,height:180,background:`#0f0f1a`},_=()=>(0,f.jsx)(`div`,{style:{width:90,height:150},children:(0,f.jsx)(a,{width:90,height:150,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,f.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),u(e,{x:5,y:5,width:80,height:140},h)}})})});_.parameters={backgrounds:{default:`transparent`}};var v=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{hvac:l(`online`,`cooling`),pos:m,config:h})})}),y=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{hvac:l(`online`,`warming`),pos:m,config:h})})}),b=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{hvac:l(`offline`,`idle`),pos:m,config:h})})}),x=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:120,height:180,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{hvac:l(`online`,`idle`),pos:m,config:h})})});_.__docgenInfo={description:``,methods:[],displayName:`Base`},v.__docgenInfo={description:``,methods:[],displayName:`OnlineCooling`},y.__docgenInfo={description:``,methods:[],displayName:`OnlineWarming`},b.__docgenInfo={description:``,methods:[],displayName:`Offline`},x.__docgenInfo={description:``,methods:[],displayName:`Idle`},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 90,
  height: 150
}}>
    <Application width={90} height={150} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      drawHvacChassis(g, {
        x: 5,
        y: 5,
        width: 80,
        height: 140
      }, config);
    }} />
    </Application>
  </div>`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "cooling")} pos={pos} config={config} />
    </Application>
  </div>`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "warming")} pos={pos} config={config} />
    </Application>
  </div>`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("offline", "idle")} pos={pos} config={config} />
    </Application>
  </div>`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "idle")} pos={pos} config={config} />
    </Application>
  </div>`,...x.parameters?.docs?.source}}};var S=[`Base`,`OnlineCooling`,`OnlineWarming`,`Offline`,`Idle`];export{_ as Base,x as Idle,b as Offline,v as OnlineCooling,y as OnlineWarming,S as __namedExportsOrder,p as default};