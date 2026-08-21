import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-DJBc3-Sk.js";import{n as i}from"./CanvasRenderer-BW_IhNuC.js";import"./lib-UjwKfymy.js";import{n as a,r as o,t as s}from"./lib-CCbCMYPM.js";import{n as c,r as l,t as u}from"./FirePanel-DI032tbr.js";var d=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var f={title:`Graphics/FirePanel`,component:u,tags:[`autodocs`]},p={width:420,height:320,background:`#0f0f1a`},m=()=>(0,d.jsx)(`div`,{style:{width:388,height:288},children:(0,d.jsx)(a,{width:388,height:288,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,d.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),c(e,4,4,380,280,{step:20}),l(e,4,4,380,280,{step:20})}})})});m.parameters={backgrounds:{default:`transparent`}};var h=()=>(0,d.jsx)(`div`,{style:p,children:(0,d.jsx)(a,{width:420,height:320,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(u,{data:{fault:!1,fire:!1,firstStageAlarm:!1,secondStageAlarm:!1,discharged:!1,extract:!1,modeAuto:!0,hold:!1,abort:!1},x:20,y:20,width:380,height:280,config:{step:20}})})}),g=()=>(0,d.jsx)(`div`,{style:p,children:(0,d.jsx)(a,{width:420,height:320,background:986906,antialias:!1,resolution:1,children:(0,d.jsx)(u,{data:{fault:!1,fire:!0,firstStageAlarm:!0,secondStageAlarm:!0,discharged:!0,extract:!0,modeAuto:!0,hold:!1,abort:!1},x:20,y:20,width:380,height:280,config:{step:20}})})});m.__docgenInfo={description:``,methods:[],displayName:`Base`},h.__docgenInfo={description:``,methods:[],displayName:`Normal`},g.__docgenInfo={description:``,methods:[],displayName:`FireAlarm`},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 388,
  height: 288
}}>
    <Application width={388} height={288} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      drawFirePanelChassis(g, 4, 4, 380, 280, {
        step: 20
      });
      drawFirePanelSockets(g, 4, 4, 380, 280, {
        step: 20
      });
    }} />
    </Application>
  </div>`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={420} height={320} background={0x0f0f1a} antialias={false} resolution={1}>
      <FirePanel data={{
      fault: false,
      fire: false,
      firstStageAlarm: false,
      secondStageAlarm: false,
      discharged: false,
      extract: false,
      modeAuto: true,
      hold: false,
      abort: false
    }} x={20} y={20} width={380} height={280} config={{
      step: 20
    }} />
    </Application>
  </div>`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={420} height={320} background={0x0f0f1a} antialias={false} resolution={1}>
      <FirePanel data={{
      fault: false,
      fire: true,
      firstStageAlarm: true,
      secondStageAlarm: true,
      discharged: true,
      extract: true,
      modeAuto: true,
      hold: false,
      abort: false
    }} x={20} y={20} width={380} height={280} config={{
      step: 20
    }} />
    </Application>
  </div>`,...g.parameters?.docs?.source}}};var _=[`Base`,`Normal`,`FireAlarm`];export{m as Base,g as FireAlarm,h as Normal,_ as __namedExportsOrder,f as default};