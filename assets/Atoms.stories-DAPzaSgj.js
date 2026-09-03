import"./rolldown-runtime-aKtaBQYM.js";import{t as e}from"./react-BLJmJXjR.js";import{t}from"./jsx-runtime-DKdBMi_L.js";import{n}from"./tokens-CTJm1Bh4.js";import{t as r}from"./nav-icons-NPvNTbiq.js";import"./colors-BCHOZIGi.js";import{a as i,c as a,d as o,f as s,i as c,l,m as u,n as d,o as f,p,r as m,s as h,t as g,u as _}from"./StatusBadge-DcOBSs5N.js";var v=t();e();var y={title:`Components/Atoms`,tags:[`autodocs`]},b=({Badge:e})=>(0,v.jsx)(e,{children:(0,v.jsx)(`span`,{style:{color:n.textWhite},children:`Durum`})}),x={render:()=>(0,v.jsxs)(u,{children:[(0,v.jsx)(s,{name:`Kart Başlığı`}),(0,v.jsxs)(`div`,{style:{padding:12,color:n.textPrimary},children:[(0,v.jsxs)(_,{children:[(0,v.jsx)(l,{icon:(0,v.jsx)(r.dashboard,{size:14}),label:`Voltaj`,value:`48.2 V`}),(0,v.jsx)(l,{icon:(0,v.jsx)(r.dashboard,{size:14}),label:`Akım`,value:`6.1 A`}),(0,v.jsx)(l,{icon:(0,v.jsx)(r.dashboard,{size:14}),label:`Güç`,value:`0.3 kW`}),(0,v.jsx)(l,{icon:(0,v.jsx)(r.dashboard,{size:14}),label:`Sıcaklık`,value:`28 °C`})]}),(0,v.jsx)(h,{value:85,label:`SoC`,formattedValue:`%85`}),(0,v.jsx)(a,{value:85})]})]})},S={render:()=>(0,v.jsx)(p,{children:[1,2,3,4].map(e=>(0,v.jsxs)(u,{children:[(0,v.jsx)(s,{name:`Kart ${e}`}),(0,v.jsxs)(`div`,{style:{padding:12,color:n.textPrimary},children:[(0,v.jsx)(h,{value:e*20,label:`Değer`,formattedValue:`${e*20}`}),(0,v.jsx)(a,{value:e*20})]})]},e))})},C={render:()=>(0,v.jsx)(o,{children:[1,2].map(e=>(0,v.jsxs)(u,{children:[(0,v.jsx)(s,{name:`Grafik ${e}`}),(0,v.jsx)(`div`,{style:{height:200,display:`flex`,alignItems:`center`,justifyContent:`center`,color:n.textMuted},children:`Grafik alanı`})]},e))})},w={render:()=>(0,v.jsxs)(`div`,{style:{display:`flex`,gap:8,flexWrap:`wrap`},children:[(0,v.jsx)(b,{Badge:i}),(0,v.jsx)(b,{Badge:c}),(0,v.jsx)(b,{Badge:g}),(0,v.jsx)(b,{Badge:d}),(0,v.jsx)(b,{Badge:m})]})},T={render:()=>(0,v.jsxs)(`div`,{children:[(0,v.jsx)(f,{title:`Bölüm Başlığı`}),(0,v.jsx)(f,{title:`İkinci Bölüm`})]})};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <div>
      <SectionHeader title="Bölüm Başlığı" />
      <SectionHeader title="İkinci Bölüm" />
    </div>
}`,...T.parameters?.docs?.source}}};var E=[`CardAtom`,`CardGridAtom`,`ChartGridAtom`,`StatusBadges`,`SectionHeaderAtom`];export{x as CardAtom,S as CardGridAtom,C as ChartGridAtom,T as SectionHeaderAtom,w as StatusBadges,E as __namedExportsOrder,y as default};