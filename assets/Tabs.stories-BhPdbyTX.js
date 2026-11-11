import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{t}from"./react-BLJmJXjR.js";import{t as n}from"./jsx-runtime-DKdBMi_L.js";import{n as r}from"./tokens-CTJm1Bh4.js";import"./colors-D5C2JSQ7.js";import{t as i}from"./emotion-styled.browser.esm-o9TBTxhU.js";var a=e(t(),1),o=n(),s=i(`div`,{target:`e1ffigl60`})(`display:flex;flex-direction:column;gap:16px;`),c=i(`div`,{target:`e1ffigl61`})(`display:flex;gap:0;border-bottom:1px solid `,r.borderDefault,`;margin:0 -24px;padding:0 24px;`),l=i(`button`,{target:`e1ffigl62`})(`padding:8px 16px;border:none;background:none;color:`,({active:e})=>e?r.textPrimary:r.textMuted,`;font-size:13px;font-weight:`,({active:e})=>e?600:500,`;cursor:pointer;border-bottom:2px solid
    `,({active:e})=>e?r.accentLight:`transparent`,`;margin-bottom:-1px;transition:color 0.15s,border-color 0.15s;&:hover{color:`,r.textPrimary,`;}`),u=i(`div`,{target:`e1ffigl63`})(`display:flex;flex-direction:column;gap:16px;`),d=({tabs:e,defaultKey:t})=>{let n=e.filter(e=>e.visible!==!1),[r,i]=(0,a.useState)(t&&n.some(e=>e.key===t)?t:n[0]?.key??``),d=(0,a.useCallback)(e=>i(e),[]);return n.length<=1?(0,o.jsx)(o.Fragment,{children:n[0]?.content}):(0,o.jsxs)(s,{children:[(0,o.jsx)(c,{children:n.map(e=>(0,o.jsx)(l,{active:e.key===r,onClick:()=>d(e.key),children:e.label},e.key))}),(0,o.jsx)(u,{children:n.find(e=>e.key===r)?.content})]})};d.__docgenInfo={description:``,methods:[],displayName:`Tabs`,props:{tabs:{required:!0,tsType:{name:`Array`,elements:[{name:`TabItem`}],raw:`TabItem[]`},description:``},defaultKey:{required:!1,tsType:{name:`string`},description:``}}};var f={title:`Components/Tabs`,component:d,tags:[`autodocs`]},p={args:{tabs:[{key:`total`,label:`Saha Toplam Güç`,content:(0,o.jsx)(`div`,{children:`Toplam güç içeriği`})},{key:`soc`,label:`Saha Ort. SoC`,content:(0,o.jsx)(`div`,{children:`SoC içeriği`})},{key:`containers`,label:`Konteyner Bazlı`,content:(0,o.jsx)(`div`,{children:`Konteyner içeriği`})}]}},m={args:{tabs:[{key:`a`,label:`Görünür`,content:(0,o.jsx)(`div`,{children:`A`})},{key:`b`,label:`Gizli`,content:(0,o.jsx)(`div`,{children:`B`}),visible:!1},{key:`c`,label:`Görünür 2`,content:(0,o.jsx)(`div`,{children:`C`})}]}},h={args:{defaultKey:`soc`,tabs:[{key:`total`,label:`Toplam`,content:(0,o.jsx)(`div`,{children:`Toplam`})},{key:`soc`,label:`SoC`,content:(0,o.jsx)(`div`,{children:`SoC`})}]}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
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
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
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
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
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
}`,...h.parameters?.docs?.source}}};var g=[`Default`,`WithHiddenTab`,`WithDefaultKey`];export{p as Default,h as WithDefaultKey,m as WithHiddenTab,g as __namedExportsOrder,f as default};