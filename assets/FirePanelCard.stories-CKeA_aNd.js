import{a as e}from"./factories-9e-l2P_s.js";import{t}from"./FirePanelCard-BaO4nleq.js";var n={title:`Components/FirePanelCard`,component:t,tags:[`autodocs`]},r={args:{deviceId:`fire-1`,state:e()}},i={args:{deviceId:`fire-1`,state:e({fire:!0,firstStage:!0,localFire:!0})}},a={args:{deviceId:`fire-1`,state:e({fault:!0})}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "fire-1",
    state: createMockFirePanelState()
  }
}`,...r.parameters?.docs?.source}}},i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "fire-1",
    state: createMockFirePanelState({
      fire: true,
      firstStage: true,
      localFire: true
    })
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    deviceId: "fire-1",
    state: createMockFirePanelState({
      fault: true
    })
  }
}`,...a.parameters?.docs?.source}}};var o=[`Normal`,`FireAlarm`,`Fault`];export{a as Fault,i as FireAlarm,r as Normal,o as __namedExportsOrder,n as default};