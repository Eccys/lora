#!/usr/bin/env node
/**
 * Live hostname routing checks for ecys.xyz + lora.ecys.xyz.
 * Drives real HTTPS (no SSL bypass) and asserts branding split.
 *
 * Run: node scripts/verify-hostnames.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import tls from "node:tls";

const OUT = process.env.VERIFY_OUT_DIR || resolve("verify-out");
mkdirSync(OUT, { recursive: true });

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, url: res.url };
}

function titleOf(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : "";
}

function getCert(host) {
  return new Promise((resolveP, reject) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, rejectUnauthorized: true },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        resolveP({
          subject: cert.subject,
          issuer: cert.issuer,
          valid_to: cert.valid_to,
          subjectaltname: cert.subjectaltname,
          authorized: socket.authorized,
        });
      },
    );
    socket.setTimeout(15000, () => {
      socket.destroy(new Error("TLS timeout"));
    });
    socket.on("error", reject);
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const failures = [];

try {
  const apex1 = await fetchText("https://ecys.xyz/");
  const apex2 = await fetchText("https://ecys.xyz/");
  writeFileSync(resolve(OUT, "apex-1.html"), apex1.text);
  writeFileSync(resolve(OUT, "apex-2.html"), apex2.text);
  for (const [label, r] of [
    ["apex-1", apex1],
    ["apex-2", apex2],
  ]) {
    assert(r.status >= 200 && r.status < 300, `${label} status ${r.status}`);
    const t = titleOf(r.text);
    assert(t === "Ecys", `${label} title want Ecys got ${JSON.stringify(t)}`);
    assert(!/lora-maker/i.test(r.text), `${label} must not be lora-maker`);
  }

  const lora1 = await fetchText("https://lora.ecys.xyz/");
  const lora2 = await fetchText("https://lora.ecys.xyz/");
  writeFileSync(resolve(OUT, "lora-1.html"), lora1.text);
  writeFileSync(resolve(OUT, "lora-2.html"), lora2.text);
  for (const [label, r] of [
    ["lora-1", lora1],
    ["lora-2", lora2],
  ]) {
    assert(r.status >= 200 && r.status < 300, `${label} status ${r.status}`);
    const t = titleOf(r.text);
    assert(/lora/i.test(t) || /lora-maker/i.test(r.text), `${label} not lora builder (title=${t})`);
    assert(t !== "Ecys", `${label} must not be apex Ecys page`);
  }

  const certLora = await getCert("lora.ecys.xyz");
  const certApex = await getCert("ecys.xyz");
  writeFileSync(resolve(OUT, "lora-tls.json"), JSON.stringify(certLora, null, 2));
  writeFileSync(resolve(OUT, "apex-tls.json"), JSON.stringify(certApex, null, 2));
  assert(certLora.authorized !== false, "lora TLS not authorized");
  assert(
    /lora\.ecys\.xyz/i.test(certLora.subjectaltname || "") ||
      /ecys\.xyz/i.test(JSON.stringify(certLora.subject || {})),
    `lora cert SAN missing lora.ecys.xyz: ${certLora.subjectaltname}`,
  );

  console.log("OK apex=Ecys lora=lora-maker TLS authorized");
  console.log(JSON.stringify({ apexTitle: titleOf(apex1.text), loraTitle: titleOf(lora1.text), loraSan: certLora.subjectaltname }, null, 2));
  process.exit(0);
} catch (e) {
  console.error("FAIL", e.message);
  process.exit(1);
}