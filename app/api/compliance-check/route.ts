export const runtime = "nodejs";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import tesseract from "node-tesseract-ocr";
import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

const TMP_DIR = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const { text } = await extractText(uint8Array, { mergePages: true });
    console.log(text);
    return text || "";
  } catch (err) {
    console.error("PDF extraction failed:", err);
    throw new Error("Failed to extract text from PDF");
  }
}
async function extractTextFromImage(filePath: string) {
  return await tesseract.recognize(filePath, { lang: "eng", oem: 1, psm: 3 });
}
async function extractTextFromDOCX(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

function runComplianceChecks(text: string) {
  const rules = [
    {
      ruleName: "Banned Guarantee Phrase",
      severity: "High",
      regex: /(100% safe|guaranteed return|no risk)/gi,
      suggestedFix: "Remove any claims that imply guaranteed outcomes."
    },
    {
      ruleName: "Contains Contact Information",
      severity: "Medium",
      regex: /\b[\w.-]+@[\w.-]+\.\w{2,}\b|\b\d{10}\b/g,
      suggestedFix: "Remove personal email/phone numbers from corporate documents."
    },
    {
      ruleName: "Missing Disclaimer",
      severity: "Low",
      regex: /investment|returns|profit/gi,
      requiresDisclaimer: "This is not financial advice."
    }
  ];

  const violations: any[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    rules.forEach(rule => {
      const matches = line.match(rule.regex);
      if (matches) {
        violations.push({
          severity: rule.severity,
          ruleName: rule.ruleName,
          location: `Line ${index + 1}`,
          content: line.trim(),
          suggestedFix: rule.suggestedFix
        });
      }

      if (rule.requiresDisclaimer && text.includes(rule.requiresDisclaimer) === false && matches) {
        violations.push({
          severity: rule.severity,
          ruleName: "Required Disclaimer Missing",
          location: `Line ${index + 1}`,
          content: line.trim(),
          suggestedFix: `Add disclaimer: "${rule.requiresDisclaimer}"`
        });
      }
    });
  });

  const riskScore = violations.length * 15;
  return { riskScore, violations };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const document = formData.get("document") as File;

    if (!document) {
      return NextResponse.json({ error: "No document uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await document.arrayBuffer());
    const filePath = path.join(TMP_DIR, `${uuid()}-${document.name}`);
    fs.writeFileSync(filePath, buffer);

    let text = "";
    if (document.type.includes("pdf")) text = await extractTextFromPDF(buffer);
    else if (document.type.includes("word") || document.name.endsWith(".docx")) text = await extractTextFromDOCX(buffer);
    else if (document.type.startsWith("image/")) text = await extractTextFromImage(filePath);
    else return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

    if (!text.trim()) {
      return NextResponse.json({ error: "No extractable text found" }, { status: 400 });
    }

    const { riskScore, violations } = runComplianceChecks(text);

    return NextResponse.json({
      status: "success",
      fileName: document.name,
      riskScore,
      reportDetails: violations
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
