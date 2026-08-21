import{t as e}from"./jsx-runtime-DKdBMi_L.js";import{t}from"./Tabs-CmDYj62w.js";var n=e(),r={title:`Components/Tabs`,component:t,tags:[`autodocs`]},i={args:{tabs:[{key:`total`,label:`Saha Toplam Güç`,content:(0,n.jsx)(`div`,{children:`Toplam güç içeriği`})},{key:`soc`,label:`Saha Ort. SoC`,content:(0,n.jsx)(`div`,{children:`SoC içeriği`})},{key:`containers`,label:`Konteyner Bazlı`,content:(0,n.jsx)(`div`,{children:`Konteyner içeriği`})}]}},a={args:{tabs:[{key:`a`,label:`Görünür`,content:(0,n.jsx)(`div`,{children:`A`})},{key:`b`,label:`Gizli`,content:(0,n.jsx)(`div`,{children:`B`}),visible:!1},{key:`c`,label:`Görünür 2`,content:(0,n.jsx)(`div`,{children:`C`})}]}},o={args:{defaultKey:`soc`,tabs:[{key:`total`,label:`Toplam`,content:(0,n.jsx)(`div`,{children:`Toplam`})},{key:`soc`,label:`SoC`,content:(0,n.jsx)(`div`,{children:`SoC`})}]}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      key: "total",
      label: "Saha Toplam Güç",
      content: <div>Toplam güç içeriği</div>
    }, {
      key: "soc",
      label: "Saha Ort. SoC",
      content: <div>SoC içeriği</div>
    }, {
      key: "containers",
      label: "Konteyner Bazlı",
      content: <div>Konteyner içeriği</div>
    }]
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      key: "a",
      label: "Görünür",
      content: <div>A</div>
    }, {
      key: "b",
      label: "Gizli",
      content: <div>B</div>,
      visible: false
    }, {
      key: "c",
      label: "Görünür 2",
      content: <div>C</div>
    }]
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    defaultKey: "soc",
    tabs: [{
      key: "total",
      label: "Toplam",
      content: <div>Toplam</div>
    }, {
      key: "soc",
      label: "SoC",
      content: <div>SoC</div>
    }]
  }
}`,...o.parameters?.docs?.source}}};var s=[`Default`,`WithHiddenTab`,`WithDefaultKey`];export{i as Default,o as WithDefaultKey,a as WithHiddenTab,s as __namedExportsOrder,r as default};