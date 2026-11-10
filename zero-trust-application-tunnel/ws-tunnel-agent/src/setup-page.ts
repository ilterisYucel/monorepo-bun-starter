/**
 * First-boot setup sayfası — tek dosya, framework/build yok.
 * Form alanları env anahtarlarına setup-server'da çevrilir.
 */
export function renderSetupPage(): string {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ws-tunnel agent — kurulum</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 44rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  label { display: block; margin: .9rem 0 .25rem; font-weight: 600; }
  input, select { width: 100%; padding: .5rem; box-sizing: border-box; }
  .row { display: flex; gap: .6rem; margin-top: 1.2rem; }
  button { padding: .6rem 1.1rem; font-size: 1rem; cursor: pointer; }
  pre { white-space: pre-wrap; padding: .8rem; border-radius: .4rem; background: #8881; }
  .ok { color: #1a7f37; } .err { color: #b42318; }
  small { opacity: .75; }
</style>
</head>
<body>
<h1>ws-tunnel agent kurulumu</h1>
<p><small>Bu sayfa yalnız yapılandırma yokken açılır. Kaydettiğinde kapanır ve tünel başlar.</small></p>

<label for="hubUrl">Hub URL</label>
<input id="hubUrl" placeholder="http://hub.local:5003" autocomplete="off">

<label for="authMode">Kimlik modu</label>
<select id="authMode">
  <option value="token">PEER_TOKEN (env modu)</option>
  <option value="bootstrap">BOOTSTRAP_TOKEN (hub'dan üretilen tek kullanımlık)</option>
</select>

<label for="token">Token</label>
<input id="token" type="password" autocomplete="off">

<label for="peerId">Peer ID <small>(boşsa hostname)</small></label>
<input id="peerId" autocomplete="off">

<label for="serviceId">Service ID</label>
<input id="serviceId" placeholder="revpi-dashboard" autocomplete="off">

<label for="localTarget">Yerel hedef (LOCAL_TARGET)</label>
<input id="localTarget" placeholder="https://127.0.0.1:41443" autocomplete="off">

<label><input id="tlsInsecure" type="checkbox" style="width:auto"> Self-signed TLS kabul et (https hedef)</label>

<div class="row">
  <button id="testBtn" type="button">Test et</button>
  <button id="saveBtn" type="button">Kaydet ve başlat</button>
</div>
<pre id="out"></pre>

<script>
const $ = (id) => document.getElementById(id);
const out = $("out");

function form() {
  return {
    hubUrl: $("hubUrl").value.trim(),
    authMode: $("authMode").value,
    token: $("token").value.trim(),
    peerId: $("peerId").value.trim(),
    serviceId: $("serviceId").value.trim(),
    localTarget: $("localTarget").value.trim(),
    tlsInsecure: $("tlsInsecure").checked,
  };
}

async function post(path) {
  out.textContent = "…";
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form()),
    });
    const data = await response.json();
    out.textContent = JSON.stringify(data, null, 2);
    out.className = data.ok ? "ok" : "err";
    return data;
  } catch (error) {
    out.textContent = String(error);
    out.className = "err";
    return { ok: false };
  }
}

$("testBtn").onclick = () => post("/test");
$("saveBtn").onclick = async () => {
  const data = await post("/save");
  if (data.ok) {
    out.textContent = "Kaydedildi — agent baslatiliyor. Bu sayfayi kapatabilirsin.";
    out.className = "ok";
  }
};
</script>
</body>
</html>`;
}
