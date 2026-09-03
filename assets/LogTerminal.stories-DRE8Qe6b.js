import{c as e,s as t}from"./factories-9e-l2P_s.js";import{t as n}from"./LogTerminal-DoSTiOdG.js";var r={title:`Components/LogTerminal`,component:n,tags:[`autodocs`]},i={args:{provider:e([t({type:`info`,source:`system`,message:`Sistem başlatıldı`}),t({type:`success`,source:`user`,message:`BSC-1 şarj moduna geçirildi`}),t({type:`info`,source:`system`,message:`Modbus bağlantısı kuruldu`}),t({type:`warning`,source:`system`,message:`BSC-2 sıcaklık eşiği aşıldı`,details:`Sıcaklık: 52°C, Eşik: 50°C`}),t({type:`success`,source:`user`,message:`Raf konfigürasyonu güncellendi`}),t({type:`error`,source:`system`,message:`TMS-3 haberleşme hatası`,details:`Timeout: 5000ms`}),t({type:`info`,source:`user`,message:`Log görüntüleme filtresi değiştirildi`}),t({type:`success`,source:`system`,message:`TimescaleDB yazma başarılı`}),t({type:`warning`,source:`user`,message:`Manuel deşarj limiti düşük`,details:`Limit: %10`}),t({type:`error`,source:`system`,message:`Redis bağlantısı kesildi`,details:`Yeniden bağlanılıyor...`})]),maxHeight:400}},a={args:{provider:e([])}},o={args:{provider:e(Array.from({length:55},(e,n)=>t({type:[`info`,`success`,`warning`,`error`][n%4],source:[`system`,`user`][n%2],message:`Log kaydı #${n+1} - ${n%4==0?`bilgi`:n%4==1?`başarılı`:n%4==2?`uyarı`:`hata`}`}))),maxHeight:400}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockLogProvider(mixedLogs),
    maxHeight: 400
  }
}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockLogProvider([])
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    provider: createMockLogProvider(Array.from({
      length: 55
    }, (_, i) => createMockLogEntry({
      type: (["info", "success", "warning", "error"] as const)[i % 4],
      source: (["system", "user"] as const)[i % 2],
      message: \`Log kaydı #\${i + 1} - \${i % 4 === 0 ? "bilgi" : i % 4 === 1 ? "başarılı" : i % 4 === 2 ? "uyarı" : "hata"}\`
    }))),
    maxHeight: 400
  }
}`,...o.parameters?.docs?.source}}};var s=[`MixedLogs`,`Empty`,`Overflow`];export{a as Empty,i as MixedLogs,o as Overflow,s as __namedExportsOrder,r as default};