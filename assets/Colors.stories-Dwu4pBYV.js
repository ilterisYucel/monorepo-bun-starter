import"./iframe-BN3XbMSJ.js";import{t as e}from"./react-D4CrgfyT.js";import{t}from"./jsx-runtime-0piXhLHj.js";import{n}from"./tokens-BflN1BJf.js";var r=t();e();var i={title:`Design Tokens/Colors`},a=(()=>{let e=Object.keys(n),t={};for(let n of e){let e;e=n===`cable`||n===`terminal`||n===`shadow`||n.startsWith(`dc`)?`Special`:n.includes(`Alpha`)?`Alpha`:/^success|^warning|^error|^info|^idle/.test(n)?`Status`:n.startsWith(`bg`)?`Surface`:n.startsWith(`border`)?`Border`:n.startsWith(`text`)?`Text`:n.startsWith(`grad`)?`Gradient`:n.startsWith(`temp`)?`Temperature`:n.startsWith(`chart`)?`Chart`:n.startsWith(`accent`)?`Accent`:`Other`,t[e]||(t[e]=[]),t[e].push(n)}return[`Status`,`Surface`,`Border`,`Text`,`Gradient`,`Temperature`,`Special`,`Alpha`,`Chart`,`Accent`].filter(e=>t[e]).map(e=>({name:e,tokens:t[e]}))})(),o={width:60,height:40,borderRadius:4},s=()=>(0,r.jsxs)(`div`,{style:{padding:24,background:`#111`,color:`#e5e7eb`,fontFamily:`monospace`},children:[(0,r.jsxs)(`h1`,{style:{fontSize:24,marginBottom:24},children:[`Color Tokens (`,Object.keys(n).length,`)`]}),a.map(e=>(0,r.jsxs)(`section`,{style:{marginBottom:32},children:[(0,r.jsxs)(`h2`,{style:{fontSize:16,color:`#9ca3af`,marginBottom:12,borderBottom:`1px solid #2a2a3a`,paddingBottom:4},children:[e.name,` (`,e.tokens.length,`)`]}),(0,r.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:8},children:e.tokens.map(e=>(0,r.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,alignItems:`center`},children:[(0,r.jsx)(`div`,{style:{...o,background:n[e],border:`1px solid #2a2a3a`}}),(0,r.jsx)(`span`,{style:{fontSize:10,color:`#9ca3af`,marginTop:4},children:e}),(0,r.jsx)(`span`,{style:{fontSize:9,color:`#6b7280`},children:n[e]})]},e))})]},e.name))]});s.__docgenInfo={description:``,methods:[],displayName:`AllColors`},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`() => <div style={{
  padding: 24,
  background: "#111",
  color: "#e5e7eb",
  fontFamily: "monospace"
}}>
    <h1 style={{
    fontSize: 24,
    marginBottom: 24
  }}>Color Tokens ({Object.keys(COLORS).length})</h1>
    {groups.map(g => <section key={g.name} style={{
    marginBottom: 32
  }}>
        <h2 style={{
      fontSize: 16,
      color: "#9ca3af",
      marginBottom: 12,
      borderBottom: "1px solid #2a2a3a",
      paddingBottom: 4
    }}>
          {g.name} ({g.tokens.length})
        </h2>
        <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }}>
          {g.tokens.map(token => <div key={token} style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
              <div style={{
          ...swatch,
          background: COLORS[token],
          border: "1px solid #2a2a3a"
        }} />
              <span style={{
          fontSize: 10,
          color: "#9ca3af",
          marginTop: 4
        }}>{token}</span>
              <span style={{
          fontSize: 9,
          color: "#6b7280"
        }}>{COLORS[token]}</span>
            </div>)}
        </div>
      </section>)}
  </div>`,...s.parameters?.docs?.source}}};var c=[`AllColors`];export{s as AllColors,c as __namedExportsOrder,i as default};