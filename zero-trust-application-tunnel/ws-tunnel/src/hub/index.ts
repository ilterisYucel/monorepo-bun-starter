// Hub tarafı yüzey — gateway + oturum + proxy + saf peer/servis kaydı.
//
// Client tarafı kanallar `../channel` (ISocketClient/ITunnelChannel/IWsSocketClient),
// client oturumları `../session` altındadır. Hub gateway sembolleri (SessionGateway,
// HubSessionStore, TunnelProxy, IStreamSink) bu yüzeyden toplanır.
//
// Fiziksel dosya taşıması YOKTUR (sıfır regresyon yüzeyi) — yalnızca keşfedilebilir
// tek giriş noktası. Bkz. WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md §4.3.

export * from "./registry";
export * from "../proxy";
