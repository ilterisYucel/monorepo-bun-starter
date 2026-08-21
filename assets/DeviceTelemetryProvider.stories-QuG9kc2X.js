import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./react-BLJmJXjR.js";import{t as n}from"./jsx-runtime-DKdBMi_L.js";import{n as r}from"./tokens-CTJm1Bh4.js";import"./colors-BCHOZIGi.js";import{b as i}from"./factories-9e-l2P_s.js";import{t as a}from"./DeviceTelemetryProvider-DU_7BSsG.js";import{t as o}from"./MockTransport-CNKC5l9T.js";var s=n(),c=e(t(),1),l={title:`Core/DeviceTelemetryProvider`,component:a,tags:[`autodocs`]},u=()=>{let e=(0,c.useMemo)(()=>new o(i(),1e3),[]);return(0,s.jsxs)(`div`,{style:{display:`flex`,gap:24,alignItems:`center`,padding:24,background:r.bgCard,borderRadius:12},children:[(0,s.jsxs)(a,{deviceId:`bsc-1`,transport:e,children:[(0,s.jsx)(a.Gauge,{metric:`Voltage`,label:`Voltaj`}),(0,s.jsx)(a.Gauge,{metric:`Current`,label:`Akım`}),(0,s.jsx)(a.Gauge,{metric:`Temperature`,label:`Sıcaklık`}),(0,s.jsx)(a.StatusBadge,{})]}),(0,s.jsxs)(a,{deviceId:`bsc-2`,transport:e,children:[(0,s.jsx)(a.Gauge,{metric:`Voltage`,label:`Voltaj (izole)`}),(0,s.jsx)(a.StatusBadge,{})]})]})},d={render:()=>(0,s.jsx)(u,{})},f={render:()=>{let e=new o(i(),1e3);return(0,s.jsx)(`div`,{style:{padding:24,background:r.bgCard,borderRadius:12},children:(0,s.jsx)(a,{deviceId:``,transport:e,children:(0,s.jsx)(a.StatusBadge,{})})})}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Wrapper />
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => {
    const transport = new MockTransport(createMockTransportDefs(), 1000);
    return <div style={{
      padding: 24,
      background: COLORS.bgCard,
      borderRadius: 12
    }}>
        <DeviceTelemetryProvider deviceId="" transport={transport}>
          <DeviceTelemetryProvider.StatusBadge />
        </DeviceTelemetryProvider>
      </div>;
  }
}`,...f.parameters?.docs?.source}}};var p=[`IsolatedStreams`,`DisabledDevice`];export{f as DisabledDevice,d as IsolatedStreams,p as __namedExportsOrder,l as default};