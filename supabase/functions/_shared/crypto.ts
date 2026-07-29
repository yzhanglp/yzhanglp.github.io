// AES-GCM token encryption using Web Crypto API (Deno-compatible)

function b64e(buf: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64d(s: string) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

async function getKey() {
  const hex  = Deno.env.get("TOKEN_ENCRYPTION_KEY")!;
  const bytes = new Uint8Array(hex.match(/../g)!.map(h => parseInt(h, 16)));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return b64e(iv) + ":" + b64e(enc);
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey();
  const [ivB64, dataB64] = ciphertext.split(":");
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(ivB64) }, key, b64d(dataB64));
  return new TextDecoder().decode(dec);
}
