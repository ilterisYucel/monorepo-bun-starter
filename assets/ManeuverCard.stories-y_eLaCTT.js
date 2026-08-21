import{g as e,l as t,u as n}from"./factories-9e-l2P_s.js";import{t as r}from"./ManeuverCard-DaOiGISs.js";var i={title:`Components/ManeuverCard`,component:r,tags:[`autodocs`]},a=()=>{},o=t(),s={args:{maneuver:o,state:`idle`,inputs:n(),timerConfig:!0,onRun:a,onTimerExpired:a}},c={args:{maneuver:o,state:`running`,onRun:a}},l={args:{maneuver:o,state:`timer`,timerConfig:!0,onRun:a,onTimerExpired:a}},u={args:{maneuver:o,state:`success`,stepResults:e(!0),onRun:a}},d={args:{maneuver:o,state:`failed`,stepResults:e(!1),onRetry:a,onRollback:a}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    maneuver,
    state: "idle",
    inputs,
    timerConfig: true,
    onRun: noop,
    onTimerExpired: noop
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    maneuver,
    state: "running",
    onRun: noop
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    maneuver,
    state: "timer",
    timerConfig: true,
    onRun: noop,
    onTimerExpired: noop
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    maneuver,
    state: "success",
    stepResults: createMockStepResults(true),
    onRun: noop
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    maneuver,
    state: "failed",
    stepResults: createMockStepResults(false),
    onRetry: noop,
    onRollback: noop
  }
}`,...d.parameters?.docs?.source}}};var f=[`Idle`,`Running`,`TimerPending`,`Success`,`Failed`];export{d as Failed,s as Idle,c as Running,u as Success,l as TimerPending,f as __namedExportsOrder,i as default};