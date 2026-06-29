import{t as e}from"./jsx-runtime-BJU0l6-K.js";import{t}from"./DeviceGauges-fspF_Bjo.js";var n=e(),r={title:`Core/DeviceGauges`,component:t,tags:[`autodocs`],argTypes:{deviceId:{control:`text`},variant:{control:`radio`,options:[`linear`,`circular`]},size:{control:`radio`,options:[`small`,`medium`,`large`]}}},i=[{value:48.2,label:`Voltaj`,unit:`V`,min:0,max:60},{value:220,label:`AC Voltaj`,unit:`V`,min:0,max:400},{value:28.5,label:`Sıcaklık 1`,unit:`°C`,min:0,max:80},{value:32.1,label:`Sıcaklık 2`,unit:`°C`,min:0,max:80}],a=[{value:48.2,label:`Voltaj`,unit:`V`,min:0,max:60},{value:15.2,label:`Akım`,unit:`A`,min:0,max:30},{value:85,label:`SoC`,unit:`%`,min:0,max:100},{value:28.5,label:`Sıcaklık`,unit:`°C`,min:0,max:80}],o=[{value:46.1,label:`Voltaj`,unit:`V`,min:0,max:60},{value:22.8,label:`Akım`,unit:`A`,min:0,max:30},{value:42,label:`SoC`,unit:`%`,min:0,max:100},{value:34.7,label:`Sıcaklık`,unit:`°C`,min:0,max:80}],s={args:{deviceId:`BSC-1`,gauges:i,variant:`circular`}},c={render:()=>(0,n.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:24},children:[(0,n.jsx)(t,{deviceId:`BSC-1`,gauges:a,variant:`circular`}),(0,n.jsx)(t,{deviceId:`BSC-2`,gauges:o,variant:`circular`})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "BSC-1",
    gauges: singleDeviceGauges,
    variant: "circular"
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 24
  }}>
      <DeviceGauges deviceId="BSC-1" gauges={multiDeviceGauges1} variant="circular" />
      <DeviceGauges deviceId="BSC-2" gauges={multiDeviceGauges2} variant="circular" />
    </div>
}`,...c.parameters?.docs?.source}}};var l=[`SingleDevice`,`MultiDevice`];export{c as MultiDevice,s as SingleDevice,l as __namedExportsOrder,r as default};