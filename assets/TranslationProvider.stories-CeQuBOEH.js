import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{n}from"./tokens-CTJm1Bh4.js";import"./colors-BCHOZIGi.js";import{n as r,t as i}from"./TranslationProvider-CHjPpilI.js";import{n as a,t as o}from"./en-D6_vpeiw.js";var s=t();e();var c={title:`Core/TranslationProvider`,component:i,tags:[`autodocs`]},l=()=>{let{t:e,locale:t,setLocale:i}=r();return(0,s.jsxs)(`div`,{style:{display:`flex`,gap:12,alignItems:`center`,padding:24,background:n.bgCard,borderRadius:12,color:n.textPrimary},children:[(0,s.jsxs)(`span`,{style:{color:n.textMuted},children:[`Aktif dil: `,t]}),(0,s.jsx)(`button`,{onClick:()=>i(t===`tr`?`en`:`tr`),children:`Değiştir`}),(0,s.jsx)(`span`,{children:e(`status.connected`)}),(0,s.jsx)(`span`,{children:e(`status.disconnected`)})]})},u={render:()=>(0,s.jsx)(i,{dictionaries:{tr:a,en:o},defaultLocale:`tr`,children:(0,s.jsx)(l,{})})};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <TranslationProvider dictionaries={{
    tr: TR_DICT,
    en: EN_DICT
  }} defaultLocale="tr">
      <LocaleSwitcher />
    </TranslationProvider>
}`,...u.parameters?.docs?.source}}};var d=[`TrEnSwitch`];export{u as TrEnSwitch,d as __namedExportsOrder,c as default};