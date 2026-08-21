import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-DJBc3-Sk.js";import{n as i}from"./CanvasRenderer-BW_IhNuC.js";import"./lib-UjwKfymy.js";import{n as a,r as o,t as s}from"./lib-CCbCMYPM.js";import{h as c}from"./factories-9e-l2P_s.js";import"./src-X1gPnTi1.js";import{a as l,o as u}from"./elements-BRQZ8HFP.js";var d=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var f={title:`Graphics/RoomCard`,component:l,tags:[`autodocs`]},p={index:0,x:10,y:10,width:120,height:180,hvac1:{x:15,y:30,width:50,height:80},hvac2:{x:75,y:30,width:50,height:80}},m={step:30},h={width:160,height:220,background:`#0f0f1a`},g=()=>(0,d.jsx)(`div`,{style:{width:130,height:190},children:(0,d.jsx)(a,{width:130,height:190,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,d.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),u(e,{...p,x:5,y:5},m)}})})});g.parameters={backgrounds:{default:`transparent`}};var _=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(a,{width:160,height:220,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(l,{room:c(22),roomPos:p,config:m})})}),v=()=>(0,d.jsx)(`div`,{style:h,children:(0,d.jsx)(a,{width:160,height:220,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(l,{room:c(35),roomPos:p,config:m})})});g.__docgenInfo={description:``,methods:[],displayName:`Base`},_.__docgenInfo={description:``,methods:[],displayName:`RoomO1`},v.__docgenInfo={description:``,methods:[],displayName:`RoomO2`},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 130,
  height: 190
}}>
    <Application width={130} height={190} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      // Frame-only: AI yalnızca çerçeveyi üretsin — termometre kod tarafında
      drawRoomChassis(g, {
        ...roomPos,
        x: 5,
        y: 5
      }, config);
    }} />
    </Application>
  </div>`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={160} height={220} background={0x0f0f1a} antialias={false} resolution={1}>
      <RoomCard room={createMockRoomData(22)} roomPos={roomPos} config={config} />
    </Application>
  </div>`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={160} height={220} background={0x0f0f1a} antialias={false} resolution={1}>
      <RoomCard room={createMockRoomData(35)} roomPos={roomPos} config={config} />
    </Application>
  </div>`,...v.parameters?.docs?.source}}};var y=[`Base`,`RoomO1`,`RoomO2`];export{g as Base,_ as RoomO1,v as RoomO2,y as __namedExportsOrder,f as default};