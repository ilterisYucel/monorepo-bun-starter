import{s as e}from"./iframe-Cr09cmgW.js";import{t}from"./react-DzPaegB1.js";import{t as n}from"./jsx-runtime-BpF54BZE.js";import{t as r}from"./nav-icons-lN6DIskt.js";var i=n(),a=e(t(),1),o={title:`Design Tokens/Icons`},s=Object.keys(r),c=()=>{let[e,t]=(0,a.useState)(``),n=e?s.filter(t=>t.toLowerCase().includes(e.toLowerCase())):s;return(0,i.jsxs)(`div`,{style:{padding:24,background:`#111`,color:`#e5e7eb`,fontFamily:`monospace`},children:[(0,i.jsxs)(`h1`,{style:{fontSize:24,marginBottom:16},children:[`Icons (`,s.length,`)`]}),(0,i.jsx)(`input`,{type:`text`,placeholder:`Search icons...`,value:e,onChange:e=>t(e.target.value),style:{padding:`8px 12px`,fontSize:14,borderRadius:6,border:`1px solid #2a2a3a`,background:`#1a1a2e`,color:`#e5e7eb`,outline:`none`,width:280,marginBottom:24}}),(0,i.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:12},children:n.map(e=>{let t=r[e];return(0,i.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`,justifyContent:`center`,width:110,height:90,background:`#1a1a2e`,borderRadius:8,border:`1px solid #2a2a3a`,gap:8},children:[(0,i.jsx)(t,{size:24,color:`#e5e7eb`}),(0,i.jsx)(`span`,{style:{fontSize:10,color:`#9ca3af`,textAlign:`center`},children:e})]},e)})}),n.length===0&&(0,i.jsxs)(`p`,{style:{color:`#6b7280`,marginTop:24},children:[`No icons match "`,e,`"`]})]})};c.__docgenInfo={description:``,methods:[],displayName:`AllIcons`},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`() => {
  const [search, setSearch] = useState("");
  const filtered = search ? iconNames.filter(name => name.toLowerCase().includes(search.toLowerCase())) : iconNames;
  return <div style={{
    padding: 24,
    background: "#111",
    color: "#e5e7eb",
    fontFamily: "monospace"
  }}>
      <h1 style={{
      fontSize: 24,
      marginBottom: 16
    }}>Icons ({iconNames.length})</h1>
      <input type="text" placeholder="Search icons..." value={search} onChange={e => setSearch(e.target.value)} style={{
      padding: "8px 12px",
      fontSize: 14,
      borderRadius: 6,
      border: "1px solid #2a2a3a",
      background: "#1a1a2e",
      color: "#e5e7eb",
      outline: "none",
      width: 280,
      marginBottom: 24
    }} />
      <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 12
    }}>
        {filtered.map(name => {
        const Icon = SCADA_ICONS[name];
        return <div key={name} style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 110,
          height: 90,
          background: "#1a1a2e",
          borderRadius: 8,
          border: "1px solid #2a2a3a",
          gap: 8
        }}>
              <Icon size={24} color="#e5e7eb" />
              <span style={{
            fontSize: 10,
            color: "#9ca3af",
            textAlign: "center"
          }}>{name}</span>
            </div>;
      })}
      </div>
      {filtered.length === 0 && <p style={{
      color: "#6b7280",
      marginTop: 24
    }}>No icons match "{search}"</p>}
    </div>;
}`,...c.parameters?.docs?.source}}};var l=[`AllIcons`];export{c as AllIcons,l as __namedExportsOrder,o as default};