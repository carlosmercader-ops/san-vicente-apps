// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/uint8array-extras/index.js
var objectToString = Object.prototype.toString;
var uint8ArrayStringified = "[object Uint8Array]";
var arrayBufferStringified = "[object ArrayBuffer]";
function isType(value, typeConstructor, typeStringified) {
  if (!value) {
    return false;
  }
  if (value.constructor === typeConstructor) {
    return true;
  }
  return objectToString.call(value) === typeStringified;
}
function isUint8Array(value) {
  return isType(value, Uint8Array, uint8ArrayStringified);
}
function isArrayBuffer(value) {
  return isType(value, ArrayBuffer, arrayBufferStringified);
}
function isUint8ArrayOrArrayBuffer(value) {
  return isUint8Array(value) || isArrayBuffer(value);
}
function toUint8ArrayIfArrayBuffer(value) {
  return isArrayBuffer(value) ? new Uint8Array(value) : value;
}
function assertUint8ArrayOrArrayBuffer(value) {
  if (!isUint8ArrayOrArrayBuffer(value)) {
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof value}\``);
  }
}
function toUint8Array(value) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`Unsupported value, got \`${typeof value}\`.`);
}
function concatUint8Arrays(arrays, totalLength) {
  if (arrays.length === 0) {
    return new Uint8Array(0);
  }
  totalLength ??= arrays.reduce((accumulator, currentValue) => accumulator + currentValue.byteLength, 0);
  const returnValue = new Uint8Array(totalLength);
  let offset = 0;
  for (let array of arrays) {
    assertUint8ArrayOrArrayBuffer(array);
    array = toUint8ArrayIfArrayBuffer(array);
    returnValue.set(array, offset);
    offset += array.length;
  }
  return returnValue;
}
var cachedDecoders = {
  utf8: new globalThis.TextDecoder("utf8")
};
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
  }
}
var cachedEncoder = new globalThis.TextEncoder();
function stringToUint8Array(string) {
  assertString(string);
  return cachedEncoder.encode(string);
}
function base64ToBase64Url(base64) {
  return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function base64UrlToBase64(base64url) {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padding = (4 - base64.length % 4) % 4;
  return base64 + "=".repeat(padding);
}
var MAX_BLOCK_SIZE = 65535;
function uint8ArrayToBase64(array, { urlSafe = false } = {}) {
  assertUint8ArrayOrArrayBuffer(array);
  array = toUint8ArrayIfArrayBuffer(array);
  let base64 = "";
  for (let index = 0; index < array.length; index += MAX_BLOCK_SIZE) {
    const chunk = array.subarray(index, index + MAX_BLOCK_SIZE);
    base64 += globalThis.btoa(String.fromCodePoint.apply(void 0, chunk));
  }
  return urlSafe ? base64ToBase64Url(base64) : base64;
}
function base64ToUint8Array(base64String) {
  assertString(base64String);
  return Uint8Array.from(globalThis.atob(base64UrlToBase64(base64String)), (x) => x.codePointAt(0));
}
var byteToHexLookupTable = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/utils.js
function encodeRecordSize(size) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, size);
  return bytes;
}
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/client-keys.js
async function deriveClientKeys(sub) {
  const bytes = base64ToUint8Array(sub.keys.p256dh);
  const authSecretBytes = base64ToUint8Array(sub.keys.auth);
  invariant(bytes.byteLength === 65 && bytes[0] === 4, "Subscription p256dh is not an uncompressed P-256 point");
  invariant(authSecretBytes.byteLength === 16, "Subscription auth secret is not 16 bytes");
  return {
    publicKeyBytes: bytes,
    publicKey: await crypto.subtle.importKey("raw", bytes, {
      name: "ECDH",
      namedCurve: "P-256"
    }, false, []),
    authSecretBytes
  };
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/hkdf.js
function createHMAC(data) {
  const keyPromise = crypto.subtle.importKey("raw", data, {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  return {
    hash: async (input) => {
      const k = await keyPromise;
      return crypto.subtle.sign("HMAC", k, input);
    }
  };
}
async function hkdf(salt, ikm) {
  const prkhPromise = createHMAC(salt).hash(ikm).then((prk) => createHMAC(prk));
  return {
    extract: async (info, len) => {
      const prkh = await prkhPromise;
      const blocks = await Array.from({ length: Math.ceil(len / 32) }, (_, i) => i).reduce(async (acc, i) => {
        const previous = await acc;
        const hash2 = await prkh.hash(new Uint8Array([...previous.at(-1) ?? [], ...info, i + 1]));
        return [...previous, new Uint8Array(hash2)];
      }, Promise.resolve([]));
      return concatUint8Arrays(blocks).slice(0, len);
    }
  };
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/info.js
function createKeyInfo(clientPublic, serverPublic) {
  return new Uint8Array([
    ...stringToUint8Array("WebPush: info\0"),
    ...clientPublic,
    ...serverPublic
  ]);
}
function createInfo(type) {
  return stringToUint8Array(`Content-Encoding: ${type}\0`);
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/local-keys.js
async function generateLocalKeys() {
  const keyPair = await crypto.subtle.generateKey({
    name: "ECDH",
    namedCurve: "P-256"
  }, false, ["deriveBits"]);
  return {
    privateKey: keyPair.privateKey,
    publicKeyBytes: new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))
  };
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/salt.js
async function getSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/encrypt.js
var recordSize = 4096;
var headerSize = 21 + 65;
var maxPlaintextSize = recordSize - headerSize - 17;
async function encryptNotification(subscription, plaintext, options = {}) {
  invariant(plaintext.byteLength <= maxPlaintextSize, `Payload is ${plaintext.byteLength} bytes, the maximum is ${maxPlaintextSize}`);
  const clientKeys = await deriveClientKeys(subscription);
  const salt = await getSalt();
  const localKeys = await generateLocalKeys();
  const sharedSecret = await crypto.subtle.deriveBits({
    name: "ECDH",
    public: clientKeys.publicKey
  }, localKeys.privateKey, 256);
  const keyInfo = createKeyInfo(clientKeys.publicKeyBytes, localKeys.publicKeyBytes);
  const cekInfo = createInfo("aes128gcm");
  const nonceInfo = createInfo("nonce");
  const ikmHkdf = await hkdf(clientKeys.authSecretBytes, sharedSecret);
  const ikm = await ikmHkdf.extract(keyInfo, 32);
  const messageHkdf = await hkdf(salt, ikm);
  const cekBytes = await messageHkdf.extract(cekInfo, 16);
  const nonceBytes = await messageHkdf.extract(nonceInfo, 12);
  const cekCryptoKey = await crypto.subtle.importKey("raw", cekBytes, {
    name: "AES-GCM",
    length: 128
  }, false, ["encrypt"]);
  const padTo = options.pad ?? true ? maxPlaintextSize : plaintext.byteLength;
  const padded = new Uint8Array(padTo + 1);
  padded.set(plaintext);
  padded[plaintext.byteLength] = 2;
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: nonceBytes
  }, cekCryptoKey, padded);
  return new Uint8Array([
    ...salt,
    ...encodeRecordSize(recordSize),
    localKeys.publicKeyBytes.byteLength,
    ...localKeys.publicKeyBytes,
    ...new Uint8Array(encrypted)
  ]);
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/base64.js
function encodeBase64Url(value) {
  return uint8ArrayToBase64(toUint8Array(value), { urlSafe: true });
}
function objectToBase64Url(obj) {
  return encodeBase64Url(stringToUint8Array(JSON.stringify(obj)));
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/jwt.js
async function sign(payload, key) {
  const headerStr = objectToBase64Url({
    typ: "JWT",
    alg: "ES256"
  });
  const payloadStr = objectToBase64Url({
    iat: Math.floor(Date.now() / 1e3),
    ...payload
  });
  const dataStr = `${headerStr}.${payloadStr}`;
  const signature = await crypto.subtle.sign({
    name: "ECDSA",
    hash: "SHA-256"
  }, key, stringToUint8Array(dataStr));
  return `${dataStr}.${encodeBase64Url(signature)}`;
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/vapid.js
async function vapidHeaders(subscription, vapid) {
  invariant(vapid.subject, "Vapid subject is empty");
  invariant(vapid.privateKey, "Vapid private key is empty");
  invariant(vapid.publicKey, "Vapid public key is empty");
  const endpoint = new URL(subscription.endpoint);
  invariant(endpoint.protocol === "https:", `Subscription endpoint is not https: ${endpoint.protocol}`);
  const vapidPublicKeyBytes = base64ToUint8Array(vapid.publicKey);
  const publicKey = await crypto.subtle.importKey("jwk", {
    kty: "EC",
    crv: "P-256",
    x: encodeBase64Url(vapidPublicKeyBytes.slice(1, 33)),
    y: encodeBase64Url(vapidPublicKeyBytes.slice(33, 65)),
    d: vapid.privateKey
  }, {
    name: "ECDSA",
    namedCurve: "P-256"
  }, false, ["sign"]);
  const jwt = await sign({
    aud: endpoint.origin,
    exp: Math.floor(Date.now() / 1e3) + 12 * 60 * 60,
    sub: vapid.subject
  }, publicKey);
  return {
    headers: {
      authorization: `vapid t=${jwt}, k=${vapid.publicKey}`
    }
  };
}

// ../../../../2026-11-05/va/outputs/san-vicente-apps/backend/node_modules/@block65/webcrypto-web-push/dist/lib/payload.js
async function buildPushPayload(message, subscription, vapid) {
  const { headers } = await vapidHeaders(subscription, vapid);
  const body2 = await encryptNotification(subscription, stringToUint8Array(
    // if its a primitive, convert to string, otherwise stringify
    typeof message.data === "string" || typeof message.data === "number" ? message.data.toString() : JSON.stringify(message.data)
  ));
  return {
    headers: {
      ...headers,
      ttl: (message.options?.ttl || 60).toString(),
      ...message.options?.urgency && {
        urgency: message.options.urgency
      },
      ...message.options?.topic && {
        topic: message.options.topic
      },
      "content-encoding": "aes128gcm",
      "content-length": body2.byteLength.toString(),
      "content-type": "application/octet-stream"
    },
    method: "post",
    body: body2
  };
}

// src/security.js
var enc = new TextEncoder();
var b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
var unb64 = (value) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4)), (c) => c.charCodeAt(0));
var randomToken = () => b64(crypto.getRandomValues(new Uint8Array(32)));
async function hash(value) {
  return b64(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}
async function equal(a, b) {
  const aa = await hash(a), bb = await hash(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return diff === 0;
}
async function passwordHash(password, salt, iterations = 1e5, pepper = "") {
  const secret = await crypto.subtle.importKey("raw", enc.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prepared = await crypto.subtle.sign("HMAC", secret, enc.encode(password));
  const key = await crypto.subtle.importKey("raw", prepared, "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: unb64(salt), iterations, hash: "SHA-256" }, key, 256));
}
async function verifyPassword(password, record, pepper) {
  if (typeof password !== "string" || password.length > 256 || !record || !pepper) return false;
  const [algorithm, iterations, salt, digest] = record.split("$");
  if (algorithm !== "pbkdf2" || Number(iterations) < 1e5 || Number(iterations) > 1e5 || !salt || !digest) return false;
  return equal(await passwordHash(password, salt, Number(iterations), pepper), digest);
}
function safeURL(value) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || value.length > 2048) throw new Error("URL HTTPS no v\xE1lida.");
  return u.href;
}
function cleanApp(input) {
  const name = String(input.name || "").trim();
  if (!name || name.length > 80) throw new Error("El nombre debe tener entre 1 y 80 caracteres.");
  const icon = String(input.icon || "general-ios.png");
  const icons = ["general-ios.png", "comedor.jpg", "base-datos.png", "justificantes.png", "sustituciones.png", "fichaje.png", "filmoteca.png", "parte-tic.png", "parte-mantenimiento.png"];
  if (!icons.includes(icon)) throw new Error("Selecciona un icono del cat\xE1logo.");
  return { name, url: safeURL(input.url), icon };
}
function cleanSubscription(s) {
  const u = new URL(s.endpoint);
  const host = u.hostname;
  const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" || host === "web.push.apple.com" || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
  if (!allowed || u.protocol !== "https:" || u.port || u.username || u.password || u.hash || s.endpoint.length > 2048) throw new Error("Servicio push no admitido.");
  if (!s.keys || unb64(s.keys.p256dh).length !== 65 || unb64(s.keys.auth).length !== 16) throw new Error("Suscripci\xF3n no v\xE1lida.");
  return { endpoint: u.href, expirationTime: null, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

// src/worker.js
var now = () => Math.floor(Date.now() / 1e3);
var json = (body2, status = 200) => new Response(JSON.stringify(body2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
async function body(req) {
  const text = await req.text();
  if (text.length > 8192) throw new Error("Solicitud demasiado grande.");
  return JSON.parse(text);
}
async function limit(env, key, max, seconds) {
  const time = now();
  const result = await env.DB.prepare("INSERT INTO rate_limits(key,hits,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires<=? THEN 1 ELSE hits+1 END, expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING hits").bind(key, time + seconds, time, time).first();
  return result.hits <= max;
}
async function session(req, env) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  return Boolean(await env.DB.prepare("SELECT expires FROM sessions WHERE token_hash=? AND expires>?").bind(await hash(token), now()).first());
}
async function route(req, env, ctx) {
  const url = new URL(req.url), path = url.pathname;
  if (path === "/health" && req.method === "GET") return json({ ok: true });
  if (path === "/config" && req.method === "GET") return json({ pushEnabled: env.PUSH_SUBSCRIPTIONS_ENABLED === "true" && Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY), deliveryEnabled: env.PUSH_ENABLED === "true", publicKey: env.PUSH_SUBSCRIPTIONS_ENABLED === "true" ? env.VAPID_PUBLIC_KEY || "" : "" });
  const ip = await hash(req.headers.get("CF-Connecting-IP") || "local");
  if (path === "/auth/login" && req.method === "POST") {
    if (!env.PASSWORD_RECORD || !env.PASSWORD_PEPPER) return json({ error: "El acceso personal a\xFAn no est\xE1 configurado." }, 503);
    if (!await limit(env, "login:" + ip, 5, 900)) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
    const input = await body(req);
    if (!await verifyPassword(input.password, env.PASSWORD_RECORD, env.PASSWORD_PEPPER)) return json({ error: "Contrase\xF1a incorrecta." }, 401);
    const token = randomToken(), expires = now() + 1800;
    await env.DB.prepare("INSERT INTO sessions(token_hash,expires) VALUES(?,?)").bind(await hash(token), expires).run();
    return json({ token, expires });
  }
  if (path === "/auth/logout" && req.method === "POST") {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await hash(token)).run();
    return json({ ok: true });
  }
  if (path === "/apps" || path.startsWith("/apps/")) {
    if (!await session(req, env)) return json({ error: "Inicia sesi\xF3n en Mis apps." }, 401);
    if (path === "/apps" && req.method === "GET") return json({ apps: (await env.DB.prepare("SELECT id,name,url,icon,position FROM apps ORDER BY position,id").all()).results });
    if (path === "/apps" && req.method === "POST") {
      const app = cleanApp(await body(req)), id2 = crypto.randomUUID();
      if ((await env.DB.prepare("SELECT COUNT(*) AS total FROM apps").first()).total >= 100) return json({ error: "M\xE1ximo 100 aplicaciones." }, 400);
      await env.DB.prepare("INSERT INTO apps(id,name,url,icon,position) SELECT ?,?,?,?,COALESCE(MAX(position),-1)+1 FROM apps").bind(id2, app.name, app.url, app.icon).run();
      return json({ id: id2 }, 201);
    }
    if (path === "/apps/order" && req.method === "PUT") {
      const { ids } = await body(req), existing = (await env.DB.prepare("SELECT id FROM apps").all()).results.map((a) => a.id);
      if (!Array.isArray(ids) || ids.length !== existing.length || new Set(ids).size !== ids.length || ids.some((id2) => !existing.includes(id2))) return json({ error: "Orden no v\xE1lido. Recarga la lista." }, 400);
      if (ids.length) await env.DB.batch(ids.map((id2, i) => env.DB.prepare("UPDATE apps SET position=? WHERE id=?").bind(i, id2)));
      return json({ ok: true });
    }
    const id = path.slice(6);
    if (!/^[a-f0-9-]{36}$/.test(id)) return json({ error: "Aplicaci\xF3n no v\xE1lida." }, 400);
    if (req.method === "PUT") {
      const app = cleanApp(await body(req));
      await env.DB.prepare("UPDATE apps SET name=?,url=?,icon=? WHERE id=?").bind(app.name, app.url, app.icon, id).run();
      return json({ ok: true });
    }
    if (req.method === "DELETE") {
      await env.DB.prepare("DELETE FROM apps WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/subscriptions" && req.method === "POST") {
    if (env.PUSH_SUBSCRIPTIONS_ENABLED !== "true") return json({ error: "Las notificaciones a\xFAn no est\xE1n activadas." }, 503);
    if (!await limit(env, "subscribe:" + ip, 20, 3600)) return json({ error: "Demasiadas solicitudes." }, 429);
    const sub = cleanSubscription(await body(req)), id = await hash(sub.endpoint);
    await env.DB.prepare("INSERT INTO subscriptions(id,endpoint,payload,created) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").bind(id, sub.endpoint, JSON.stringify(sub), now()).run();
    return json({ ok: true });
  }
  if (path === "/subscriptions" && req.method === "DELETE") {
    const sub = cleanSubscription(await body(req)), id = await hash(sub.endpoint), row = await env.DB.prepare("SELECT payload FROM subscriptions WHERE id=?").bind(id).first();
    if (row && await equal(JSON.parse(row.payload).keys.auth, sub.keys.auth)) await env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(id).run();
    return json({ ok: true });
  }
  if (path === "/subscriptions/status" && req.method === "POST") {
    const sub = cleanSubscription(await body(req)), id = await hash(sub.endpoint), row = await env.DB.prepare("SELECT payload FROM subscriptions WHERE id=?").bind(id).first();
    const stored = row ? JSON.parse(row.payload) : null;
    return json({ registered: Boolean(stored && await equal(stored.keys.auth, sub.keys.auth) && await equal(stored.keys.p256dh, sub.keys.p256dh)), deliveryEnabled: env.PUSH_ENABLED === "true" });
  }
  if (path === "/subscriptions/test" && req.method === "POST") {
    if (env.PUSH_ENABLED !== "true") return json({ error: "Los env\xEDos push est\xE1n desactivados en el servidor." }, 503);
    if (!await limit(env, "push-test:" + ip, 6, 900)) return json({ error: "Espera unos minutos antes de repetir la prueba." }, 429);
    const sub = cleanSubscription(await body(req)), id = await hash(sub.endpoint), row = await env.DB.prepare("SELECT payload FROM subscriptions WHERE id=?").bind(id).first();
    const stored = row ? JSON.parse(row.payload) : null;
    if (!stored || !await equal(stored.keys.auth, sub.keys.auth) || !await equal(stored.keys.p256dh, sub.keys.p256dh)) return json({ error: "Este dispositivo no est\xE1 registrado. Activa sus avisos antes de probar." }, 409);
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ error: "Falta configurar la firma del servicio de avisos." }, 503);
    const testId = crypto.randomUUID();
    let status = 0;
    try {
      const payload = await buildPushPayload({ data: JSON.stringify({ type: "sustituciones-test", testId }), options: { ttl: 120, urgency: "high" } }, sub, { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
      status = (await fetch(sub.endpoint, { ...payload, redirect: "error", signal: AbortSignal.timeout(15e3) })).status;
    } catch {
      return json({ error: "No se ha podido preparar o conectar el aviso push de prueba. Comprueba la configuraci\xF3n del servicio." }, 502);
    }
    if (status === 404 || status === 410) {
      await env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(id).run();
      return json({ error: "La suscripci\xF3n ha caducado. Desactiva y vuelve a activar los avisos en este dispositivo." }, 410);
    }
    if (status < 200 || status >= 300) return json({ error: "El servicio de notificaciones rechaz\xF3 la prueba (HTTP " + status + ")." + ([401, 403].includes(status) ? " Es necesario revisar la firma de los avisos." : ""), providerStatus: status }, 502);
    return json({ ok: true, testId, accepted: true }, 202);
  }
  if (path === "/publish/status" && req.method === "GET") {
    if (!env.PUBLISH_SECRET || !await equal(req.headers.get("X-Publish-Key") || "", env.PUBLISH_SECRET)) return json({ error: "No autorizado." }, 401);
    const subs = await env.DB.prepare("SELECT COUNT(*) AS total FROM subscriptions").first(), events = await env.DB.prepare("SELECT COUNT(*) AS total FROM events").first();
    return json({ ok: true, deliveryEnabled: env.PUSH_ENABLED === "true", subscriptions: subs.total, acceptedPublications: events.total });
  }
  if (path === "/publish/sustituciones" && req.method === "POST") {
    if (!env.PUBLISH_SECRET || !await equal(req.headers.get("X-Publish-Key") || "", env.PUBLISH_SECRET)) return json({ error: "No autorizado." }, 401);
    if (env.PUSH_ENABLED !== "true") return json({ error: "Env\xEDo push desactivado." }, 503);
    const input = await body(req);
    if (input.source !== "sustituciones" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isInteger(input.version) || input.version < 1 || !/^[a-f0-9]{64}$/.test(input.contentHash)) return json({ error: "Publicaci\xF3n no v\xE1lida." }, 400);
    const id = await hash(input.date + ":" + input.version + ":" + input.contentHash);
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO events(id,date,content_hash,created) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM publication_heads WHERE date=? AND (version>=? OR content_hash=?))").bind(id, input.date, input.version + ":" + input.contentHash, now(), input.date, input.version, input.contentHash),
      env.DB.prepare("INSERT OR IGNORE INTO deliveries(event_id,subscription_id) SELECT ?,id FROM subscriptions WHERE created<=(SELECT created FROM events WHERE id=?)").bind(id, id),
      env.DB.prepare("INSERT INTO publication_heads(date,version,content_hash) VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET version=excluded.version,content_hash=excluded.content_hash WHERE excluded.version>publication_heads.version").bind(input.date, input.version, input.contentHash)
    ]);
    ctx.waitUntil(deliver(env));
    return json({ ok: true, eventId: id }, 202);
  }
  return json({ error: "Ruta no disponible." }, 404);
}
async function deliver(env) {
  if (env.PUSH_ENABLED !== "true" || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const rows = (await env.DB.prepare("SELECT d.event_id,d.subscription_id,d.attempts,s.payload FROM deliveries d JOIN subscriptions s ON s.id=d.subscription_id WHERE d.status='pending' AND d.retry_after<=? AND d.attempts<5 LIMIT 30").bind(now()).all()).results;
  for (const row of rows) {
    const claim = await env.DB.prepare("UPDATE deliveries SET status='sending',retry_after=? WHERE event_id=? AND subscription_id=? AND status='pending'").bind(now() + 300, row.event_id, row.subscription_id).run();
    if (!claim.meta.changes) continue;
    let status = 0;
    try {
      const subscription = cleanSubscription(JSON.parse(row.payload));
      const message = { data: JSON.stringify({ type: "sustituciones", eventId: row.event_id }), options: { ttl: 3600 } };
      const payload = await buildPushPayload(message, subscription, { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
      status = (await fetch(subscription.endpoint, { ...payload, redirect: "error", signal: AbortSignal.timeout(15e3) })).status;
    } catch {
    }
    if (status === 404 || status === 410) {
      await env.DB.prepare("DELETE FROM subscriptions WHERE id=?").bind(row.subscription_id).run();
      await env.DB.prepare("UPDATE deliveries SET status='expired' WHERE event_id=? AND subscription_id=?").bind(row.event_id, row.subscription_id).run();
    } else {
      const done = status >= 200 && status < 300;
      const terminal = !done && status >= 400 && status < 500 && status !== 429;
      await env.DB.prepare("UPDATE deliveries SET status=?,attempts=attempts+1,retry_after=? WHERE event_id=? AND subscription_id=?").bind(done ? "sent" : terminal || row.attempts >= 4 ? "failed" : "pending", now() + Math.min(3600, 60 * 2 ** row.attempts), row.event_id, row.subscription_id).run();
    }
  }
}
var worker_default = {
  async fetch(req, env, ctx) {
    const origin = req.headers.get("Origin");
    if (origin && origin !== env.ALLOWED_ORIGIN) return json({ error: "Origen no autorizado." }, 403);
    let response;
    if (req.method === "OPTIONS") response = new Response(null, { status: 204 });
    else {
      try {
        response = await route(req, env, ctx);
      } catch {
        response = json({ error: "No se ha podido completar la solicitud." }, 400);
      }
    }
    const headers = new Headers(response.headers);
    if (origin === env.ALLOWED_ORIGIN) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      headers.set("Vary", "Origin");
    }
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(event, env, ctx) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires<=?").bind(now()),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires<=?").bind(now()),
      env.DB.prepare("UPDATE deliveries SET status='pending' WHERE status='sending' AND retry_after<=?").bind(now()),
      env.DB.prepare("DELETE FROM deliveries WHERE subscription_id NOT IN (SELECT id FROM subscriptions)"),
      env.DB.prepare("DELETE FROM deliveries WHERE event_id IN (SELECT id FROM events WHERE created<?)").bind(now() - 2592e3),
      env.DB.prepare("DELETE FROM events WHERE created<?").bind(now() - 2592e3)
    ]);
    ctx.waitUntil(deliver(env));
  }
};
export {
  worker_default as default,
  deliver,
  route
};
