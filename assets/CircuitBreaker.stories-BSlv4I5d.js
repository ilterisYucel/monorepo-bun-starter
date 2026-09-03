import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-V7s6uY3x.js";import{n as i}from"./CanvasRenderer-C8mbTmot.js";import"./lib-BWUuX8Sy.js";import{n as a,r as o,t as s}from"./lib-xY3v-sQ6.js";import{t as c}from"./SpriteTextureProvider-CbxKmb-s.js";import"./SpriteTextureProvider-CJNNbxkx.js";import{t as l}from"./textures-M_6d12p_.js";import"./src-BV1oujNP.js";import{i as u,r as d}from"./DCOutput-vIOt7crY.js";var f=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var p={title:`Graphics/CircuitBreaker`,component:d,tags:[`autodocs`]},m={step:30},h={circuitBreaker:{endX:120,gapSize:12},convergence:{x:40},topBusY:30,bottomBusY:90},g={width:200,height:160,background:`#0f0f1a`},_={circuitBreaker:{endX:80,gapSize:8},convergence:{x:0},topBusY:0,bottomBusY:70},v=e=>{e.clear(),e.rect(20,0,60,70),e.stroke({width:10,color:4868698}),e.rect(33.2,15.4,33.6,39.2),e.stroke({width:6,color:4868698})},y=(e,t)=>{e.setStrokeStyle({width:6,color:4868698,cap:`round`}),t===`close`?(e.moveTo(24,35),e.lineTo(40,35),e.stroke(),e.moveTo(40,31),e.lineTo(50,39),e.stroke(),e.moveTo(50,35),e.lineTo(66,35),e.stroke()):(e.moveTo(24,35),e.lineTo(40,35),e.stroke(),e.moveTo(45,27),e.lineTo(45,43),e.stroke(),e.moveTo(50,35),e.lineTo(66,35),e.stroke())},b=()=>(0,f.jsx)(`div`,{style:{width:120,height:110},children:(0,f.jsx)(a,{width:120,height:110,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,f.jsxs)(`pixiContainer`,{x:20,y:20,children:[(0,f.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),u(e,{step:100},_)}}),(0,f.jsx)(`pixiGraphics`,{draw:v}),(0,f.jsx)(`pixiGraphics`,{draw:e=>y(e,`close`)})]})})});b.parameters={backgrounds:{default:`transparent`}};var x=()=>(0,f.jsx)(`div`,{style:{width:120,height:110},children:(0,f.jsx)(a,{width:120,height:110,backgroundAlpha:0,antialias:!1,resolution:1,children:(0,f.jsxs)(`pixiContainer`,{x:20,y:20,children:[(0,f.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),u(e,{step:100},_)}}),(0,f.jsx)(`pixiGraphics`,{draw:v}),(0,f.jsx)(`pixiGraphics`,{draw:e=>y(e,`open`)})]})})});x.parameters={backgrounds:{default:`transparent`}};var S=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:200,height:160,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(c,{assets:l,children:(0,f.jsx)(d,{config:m,positions:h,breakerStatus:`online`,breakerPosition:`close`})})})}),C=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:200,height:160,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{config:m,positions:h,breakerStatus:`online`,breakerPosition:`close`})})}),w=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:200,height:160,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{config:m,positions:h,breakerStatus:`online`,breakerPosition:`open`})})}),T=()=>(0,f.jsx)(`div`,{style:g,children:(0,f.jsx)(a,{width:200,height:160,background:986906,antialias:!1,resolution:1,children:(0,f.jsx)(d,{config:m,positions:h,breakerStatus:`offline`,breakerPosition:`close`})})});b.__docgenInfo={description:``,methods:[],displayName:`BaseClose`},x.__docgenInfo={description:``,methods:[],displayName:`BaseOpen`},S.__docgenInfo={description:``,methods:[],displayName:`SpriteMode`},C.__docgenInfo={description:``,methods:[],displayName:`OnlineClosed`},w.__docgenInfo={description:``,methods:[],displayName:`OnlineOpen`},T.__docgenInfo={description:``,methods:[],displayName:`Offline`},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 120,
  height: 110
}}>
    <Application width={120} height={110} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiContainer x={20} y={20}>
        <pixiGraphics draw={g => {
        g.clear();
        drawBreakerChassis(g, {
          step: 100
        }, basePositions);
      }} />
        <pixiGraphics draw={drawThickSquares} />
        <pixiGraphics draw={g => drawNeutralBlade(g, "close")} />
      </pixiContainer>
    </Application>
  </div>`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 120,
  height: 110
}}>
    <Application width={120} height={110} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiContainer x={20} y={20}>
        <pixiGraphics draw={g => {
        g.clear();
        drawBreakerChassis(g, {
          step: 100
        }, basePositions);
      }} />
        <pixiGraphics draw={drawThickSquares} />
        <pixiGraphics draw={g => drawNeutralBlade(g, "open")} />
      </pixiContainer>
    </Application>
  </div>`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <CircuitBreaker config={config} positions={positions} breakerStatus="online" breakerPosition="close" />
      </SpriteTextureProvider>
    </Application>
  </div>`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <CircuitBreaker config={config} positions={positions} breakerStatus="online" breakerPosition="close" />
    </Application>
  </div>`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <CircuitBreaker config={config} positions={positions} breakerStatus="online" breakerPosition="open" />
    </Application>
  </div>`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <CircuitBreaker config={config} positions={positions} breakerStatus="offline" breakerPosition="close" />
    </Application>
  </div>`,...T.parameters?.docs?.source}}};var E=[`BaseClose`,`BaseOpen`,`SpriteMode`,`OnlineClosed`,`OnlineOpen`,`Offline`];export{b as BaseClose,x as BaseOpen,T as Offline,C as OnlineClosed,w as OnlineOpen,S as SpriteMode,E as __namedExportsOrder,p as default};