import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { Storage } from "@google-cloud/storage";
import { fileURLToPath } from "url";

const GCS_BUCKET = process.env.GCS_BUCKET || "hojas_vida_logyser";
const storage = new Storage();
const bucket = storage.bucket(GCS_BUCKET);

// Resolve template path relative to this module (robusto en dev/contener)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, "templates", "cv_template.html");

// helper: load template file and replace placeholders
async function renderHtmlFromTemplate(templatePath, data) {
  let html = await fs.readFile(templatePath, "utf8");
  // Simple placeholder replacement: {{KEY}}
  Object.entries(data).forEach(([k, v]) => {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, "g");
    html = html.replace(re, v != null ? String(v) : "");
  });
  return html;
}

async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" }
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

export async function generateAndUploadPdf({ identificacion, dataObjects, destNamePrefix }) {
  const templatePath = TEMPLATE_PATH;
  const html = await renderHtmlFromTemplate(templatePath, dataObjects);
  const pdfBuffer = await htmlToPdfBuffer(html);

  const destName = `${identificacion}/${destNamePrefix || "cv"}_${Date.now()}.pdf`;
  const file = bucket.file(destName);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    resumable: false
  });

  const expiresMs = parseInt(process.env.SIGNED_URL_EXPIRES_MS || String(7 * 24 * 60 * 60 * 1000), 10);
  const expiresAt = Date.now() + expiresMs;
  let signedUrl = null;
  try {
    const [url] = await file.getSignedUrl({ action: "read", expires: expiresAt });
    signedUrl = url;
  } catch (err) {
    console.warn("pdf getSignedUrl falló:", err && err.message ? err.message : err);
    signedUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${destName}`;
  }

  return { destName, signedUrl };
}