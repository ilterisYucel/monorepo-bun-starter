import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{n}from"./tokens-CTJm1Bh4.js";import{t as r}from"./nav-icons-C4xSIWo6.js";import"./icons-CwPlL2ht.js";import"./colors-D5C2JSQ7.js";import{t as i}from"./emotion-styled.browser.esm-o9TBTxhU.js";e();var a=t(),o=i(`div`,{target:`evdmi7h0`})(`background:`,n.bgCard,`;border:1px solid `,n.borderDefault,`;border-radius:14px;padding:16px;transition:all 0.2s ease;display:flex;flex-direction:column;overflow:hidden;&:hover{transform:translateY(-2px);border-color:`,n.info,`;box-shadow:0 8px 24px rgba(0,0,0,0.2);}`),s=({children:e,className:t,onClick:n})=>(0,a.jsx)(o,{className:t,onClick:n,style:n?{cursor:`pointer`}:void 0,children:e});s.displayName=`Card`,s.__docgenInfo={description:``,methods:[],displayName:`Card`,props:{children:{required:!0,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``},className:{required:!1,tsType:{name:`string`},description:``},onClick:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}};var c=i(`div`,{target:`e1u9z7u20`})(`display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;@media (max-width:1280px){grid-template-columns:repeat(3,1fr);}@media (max-width:1024px){grid-template-columns:repeat(2,1fr);}@media (max-width:768px){grid-template-columns:1fr;}`),l=i(`div`,{target:`ewlq9xx0`})(`display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:6px;`),u=i(`span`,{target:`ewlq9xx1`})(`font-weight:700;color:`,n.textPrimary,`;font-size:16px;letter-spacing:0.5px;`),d=i(`div`,{target:`ewlq9xx2`})(`display:flex;gap:6px;`),f=({name:e,badges:t,children:n})=>(0,a.jsxs)(l,{children:[(0,a.jsx)(u,{children:e}),t&&(0,a.jsx)(d,{children:t}),n]});f.displayName=`CardHeader`,f.__docgenInfo={description:``,methods:[],displayName:`CardHeader`,props:{name:{required:!0,tsType:{name:`string`},description:``},badges:{required:!1,tsType:{name:`ReactNode`},description:``},children:{required:!1,tsType:{name:`ReactNode`},description:``}}};var p=i(`div`,{target:`e1f9v8t0`})(`display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;@media (max-width:1024px){grid-template-columns:1fr;}`),m=i(`div`,{target:`e7uybc60`})(`display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px;`),h=i(`div`,{target:`e1mwhljq0`})(`display:flex;align-items:center;gap:8px;background:`,n.bgInput,`;padding:8px 10px;border-radius:8px;`),g=i(`span`,{target:`e1mwhljq1`})(`font-size:15px;min-width:22px;display:flex;align-items:center;justify-content:center;`),_=i(`span`,{target:`e1mwhljq2`})(`font-size:11px;color:`,n.textMuted,`;flex:1;`),v=i(`span`,{target:`e1mwhljq3`})(`font-size:12px;font-weight:600;color:`,n.textPrimary,`;`),y=({icon:e,label:t,value:n})=>(0,a.jsxs)(h,{children:[(0,a.jsx)(g,{children:e}),(0,a.jsx)(_,{children:t}),(0,a.jsx)(v,{children:n})]});y.displayName=`DataRow`,y.__docgenInfo={description:``,methods:[],displayName:`DataRow`,props:{icon:{required:!0,tsType:{name:`ReactNode`},description:``},label:{required:!0,tsType:{name:`string`},description:``},value:{required:!0,tsType:{name:`string`},description:``}}};var b=i(`div`,{target:`emt1fzn0`})(`width:100%;height:8px;background:`,n.borderDefault,`;border-radius:4px;overflow:hidden;`),x=i(`div`,{target:`emt1fzn1`})(`height:100%;background:linear-gradient(90deg,`,n.info,`,`,n.success,`);border-radius:4px;transition:width 0.3s ease;`),S=({value:e,max:t=100})=>{let n=Math.min(t,Math.max(0,e||0));return(0,a.jsx)(b,{children:(0,a.jsx)(x,{style:{width:`${n}%`}})})};S.displayName=`MetricBar`,S.__docgenInfo={description:``,methods:[],displayName:`MetricBar`,props:{value:{required:!0,tsType:{name:`number`},description:``},max:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`100`,computed:!1}}}};var C=i(`div`,{target:`e1nkflvy0`})(`flex:1;display:flex;flex-direction:column;align-items:center;padding:18px 12px 14px;background:`,n.bgInput,`;border-radius:14px;`),w=i(`div`,{target:`e1nkflvy1`})(`font-size:42px;font-weight:800;color:`,n.info,`;line-height:1;margin-bottom:4px;`),T=i(`div`,{target:`e1nkflvy2`})(`font-size:12px;color:`,n.textMuted,`;margin-bottom:12px;`),E=({value:e,label:t,formattedValue:n})=>(0,a.jsxs)(C,{children:[(0,a.jsx)(w,{children:n}),(0,a.jsx)(T,{children:t}),(0,a.jsx)(S,{value:e})]});E.displayName=`MetricDisplay`,E.__docgenInfo={description:``,methods:[],displayName:`MetricDisplay`,props:{value:{required:!0,tsType:{name:`number`},description:``},label:{required:!0,tsType:{name:`string`},description:``},formattedValue:{required:!0,tsType:{name:`string`},description:``}}};var D=i(`div`,{target:`e1q8sc4i0`})(`display:flex;align-items:center;gap:16px;margin-bottom:16px;margin-top:8px;&::before,&::after{content:"";flex:1;height:1px;background:`,n.borderDefault,`;}`),O=i(`h3`,{target:`e1q8sc4i1`})(`font-size:14px;font-weight:600;color:`,n.textMuted,`;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;margin:0;`),k=({title:e})=>(0,a.jsx)(D,{children:(0,a.jsx)(O,{children:e})});k.displayName=`SectionHeader`,k.__docgenInfo={description:``,methods:[],displayName:`SectionHeader`,props:{title:{required:!0,tsType:{name:`string`},description:``}}};var A=i(`span`,{target:`emr9ewd0`})(`padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px;`),j=i(A,{target:`emr9ewd1`})(`background:`,n.successAlpha12,`;color:`,n.success,`;border:1px solid `,n.success,`;`),M=i(A,{target:`emr9ewd2`})(`background:`,n.errorAlpha12,`;color:`,n.error,`;border:1px solid `,n.error,`;`),N=i(A,{target:`emr9ewd3`})(`background:`,n.successAlpha12,`;color:`,n.success,`;border:1px solid `,n.success,`;`),P=i(A,{target:`emr9ewd4`})(`background:`,n.warningAlpha12,`;color:`,n.warning,`;border:1px solid `,n.warning,`;`),F=i(A,{target:`emr9ewd5`})(`background:`,n.idleAlpha12,`;color:`,n.textMuted,`;border:1px solid `,n.textDisabled,`;`),I={title:`Components/Atoms`,tags:[`autodocs`]},L=({Badge:e})=>(0,a.jsx)(e,{children:(0,a.jsx)(`span`,{style:{color:n.textWhite},children:`Durum`})}),R={render:()=>(0,a.jsxs)(s,{children:[(0,a.jsx)(f,{name:`Kart Başlığı`}),(0,a.jsxs)(`div`,{style:{padding:12,color:n.textPrimary},children:[(0,a.jsxs)(m,{children:[(0,a.jsx)(y,{icon:(0,a.jsx)(r.dashboard,{size:14}),label:`Voltaj`,value:`48.2 V`}),(0,a.jsx)(y,{icon:(0,a.jsx)(r.dashboard,{size:14}),label:`Akım`,value:`6.1 A`}),(0,a.jsx)(y,{icon:(0,a.jsx)(r.dashboard,{size:14}),label:`Güç`,value:`0.3 kW`}),(0,a.jsx)(y,{icon:(0,a.jsx)(r.dashboard,{size:14}),label:`Sıcaklık`,value:`28 °C`})]}),(0,a.jsx)(E,{value:85,label:`SoC`,formattedValue:`%85`}),(0,a.jsx)(S,{value:85})]})]})},z={render:()=>(0,a.jsx)(c,{children:[1,2,3,4].map(e=>(0,a.jsxs)(s,{children:[(0,a.jsx)(f,{name:`Kart ${e}`}),(0,a.jsxs)(`div`,{style:{padding:12,color:n.textPrimary},children:[(0,a.jsx)(E,{value:e*20,label:`Değer`,formattedValue:`${e*20}`}),(0,a.jsx)(S,{value:e*20})]})]},e))})},B={render:()=>(0,a.jsx)(p,{children:[1,2].map(e=>(0,a.jsxs)(s,{children:[(0,a.jsx)(f,{name:`Grafik ${e}`}),(0,a.jsx)(`div`,{style:{height:200,display:`flex`,alignItems:`center`,justifyContent:`center`,color:n.textMuted},children:`Grafik alanı`})]},e))})},V={render:()=>(0,a.jsxs)(`div`,{style:{display:`flex`,gap:8,flexWrap:`wrap`},children:[(0,a.jsx)(L,{Badge:j}),(0,a.jsx)(L,{Badge:M}),(0,a.jsx)(L,{Badge:N}),(0,a.jsx)(L,{Badge:P}),(0,a.jsx)(L,{Badge:F})]})},H={render:()=>(0,a.jsxs)(`div`,{children:[(0,a.jsx)(k,{title:`Bölüm Başlığı`}),(0,a.jsx)(k,{title:`İkinci Bölüm`})]})};R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: () => <Card>
      <CardHeader name="Kart Başlığı" />
      <div style={{
      padding: 12,
      color: COLORS.textPrimary
    }}>
        <DataGrid>
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Voltaj" value="48.2 V" />
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Akım" value="6.1 A" />
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Güç" value="0.3 kW" />
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Sıcaklık" value="28 °C" />
        </DataGrid>
        <MetricDisplay value={85} label="SoC" formattedValue="%85" />
        <MetricBar value={85} />
      </div>
    </Card>
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  render: () => <CardGrid>
      {[1, 2, 3, 4].map(i => <Card key={i}>
          <CardHeader name={\`Kart \${i}\`} />
          <div style={{
        padding: 12,
        color: COLORS.textPrimary
      }}>
            <MetricDisplay value={i * 20} label="Değer" formattedValue={\`\${i * 20}\`} />
            <MetricBar value={i * 20} />
          </div>
        </Card>)}
    </CardGrid>
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  render: () => <ChartGrid>
      {[1, 2].map(i => <Card key={i}>
          <CardHeader name={\`Grafik \${i}\`} />
          <div style={{
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: COLORS.textMuted
      }}>
            Grafik alanı
          </div>
        </Card>)}
    </ChartGrid>
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  }}>
      <BadgeDemo Badge={Online} />
      <BadgeDemo Badge={Offline} />
      <BadgeDemo Badge={Charge} />
      <BadgeDemo Badge={Discharge} />
      <BadgeDemo Badge={Idle} />
    </div>
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  render: () => <div>
      <SectionHeader title="Bölüm Başlığı" />
      <SectionHeader title="İkinci Bölüm" />
    </div>
}`,...H.parameters?.docs?.source}}};var U=[`CardAtom`,`CardGridAtom`,`ChartGridAtom`,`StatusBadges`,`SectionHeaderAtom`];export{R as CardAtom,z as CardGridAtom,B as ChartGridAtom,H as SectionHeaderAtom,V as StatusBadges,U as __namedExportsOrder,I as default};