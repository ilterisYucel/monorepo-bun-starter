import{t as e}from"./LogTerminal-BADeOaM-.js";import{a as t,i as n}from"./factories-Dm0sfm_r.js";var r={title:`Components/LogTerminal`,component:e,tags:[`autodocs`]},i={args:{provider:t([n({type:`info`,source:`system`,message:`Sistem başlatıldı`}),n({type:`success`,source:`user`,message:`BSC-1 şarj moduna geçirildi`}),n({type:`info`,source:`system`,message:`Modbus bağlantısı kuruldu`}),n({type:`warning`,source:`system`,message:`BSC-2 sıcaklık eşiği aşıldı`,details:`Sıcaklık: 52°C, Eşik: 50°C`}),n({type:`success`,source:`user`,message:`Raf konfigürasyonu güncellendi`}),n({type:`error`,source:`system`,message:`TMS-3 haberleşme hatası`,details:`Timeout: 5000ms`}),n({type:`info`,source:`user`,message:`Log görüntüleme filtresi değiştirildi`}),n({type:`success`,source:`system`,message:`TimescaleDB yazma başarılı`}),n({type:`warning`,source:`user`,message:`Manuel deşarj limiti düşük`,details:`Limit: %10`}),n({type:`error`,source:`system`,message:`Redis bağlantısı kesildi`,details:`Yeniden bağlanılıyor...`})]),maxHeight:400}},a={args:{provider:t([])}},o={args:{provider:t(Array.from({length:55},(e,t)=>n({type:[`info`,`success`,`warning`,`error`][t%4],source:[`system`,`user`][t%2],message:`Log kaydı #${t+1} - ${t%4==0?`bilgi`:t%4==1?`başarılı`:t%4==2?`uyarı`:`hata`}`}))),maxHeight:400}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
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