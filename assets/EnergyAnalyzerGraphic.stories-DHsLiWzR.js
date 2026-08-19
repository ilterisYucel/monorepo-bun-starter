import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{i as n,l as r}from"./Filter-DJBc3-Sk.js";import{n as i}from"./CanvasRenderer-BW_IhNuC.js";import"./SpriteTextureProvider-CMLAl3XL.js";import{n as a,r as o,t as s}from"./lib-yE4Adh3N.js";import{n as c,t as l}from"./EnergyAnalyzerGraphic-DWLnsSBD.js";var u=t();e(),s({Container:r,Graphics:i,Text:o,Sprite:n});var d={title:`Graphics/EnergyAnalyzerGraphic`,component:l,tags:[`autodocs`]},f={width:340,height:420,background:`#0f0f1a`},p=()=>(0,u.jsx)(`div`,{style:{width:308,height:214},children:(0,u.jsxs)(a,{width:308,height:214,backgroundAlpha:0,antialias:!1,resolution:1,children:[(0,u.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),c(e,4,4,300,206,20)}}),(0,u.jsx)(`pixiGraphics`,{draw:e=>{e.clear(),e.roundRect(4,4,300,206,1.6),e.stroke({width:16,color:4868698}),e.roundRect(58,60,192,88,1),e.stroke({width:9,color:4868698})}})]})});p.parameters={backgrounds:{default:`transparent`}};var m=()=>(0,u.jsx)(`div`,{style:f,children:(0,u.jsx)(a,{width:340,height:420,background:986906,antialias:!1,resolution:1,children:(0,u.jsx)(l,{data:{voltage:391.2,current:148.7,power:58.2,energy:12345.6},x:20,y:20,width:300,height:380,config:{step:20},label:`EA-01`})})});p.__docgenInfo={description:``,methods:[],displayName:`Base`},m.__docgenInfo={description:``,methods:[],displayName:`Normal`},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`() => <div style={{
  width: 308,
  height: 214
}}>
    <Application width={308} height={214} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={g => {
      g.clear();
      drawEABox(g, 4, 4, 300, 206, 20);
    }} />
      <pixiGraphics draw={g => {
      g.clear();
      // AI üretim referansı için KALIN iç içe 2 kutu — kutular dominant eleman,
      // AI'ın düşürmemesi için belirgin çizilir
      g.roundRect(4, 4, 300, 206, 1.6);
      g.stroke({
        width: 16,
        color: 0x4a4a5a
      });
      g.roundRect(58, 60, 192, 88, 1);
      g.stroke({
        width: 9,
        color: 0x4a4a5a
      });
    }} />
    </Application>
  </div>`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`() => <div style={wrapper}>
    <Application width={340} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <EnergyAnalyzerGraphic data={{
      voltage: 391.2,
      current: 148.7,
      power: 58.2,
      energy: 12345.6
    }} x={20} y={20} width={300} height={380} config={{
      step: 20
    }} label="EA-01" />
    </Application>
  </div>`,...m.parameters?.docs?.source}}};var h=[`Base`,`Normal`];export{p as Base,m as Normal,h as __namedExportsOrder,d as default};