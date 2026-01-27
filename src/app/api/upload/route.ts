import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// -----------------------------
// Utils
// -----------------------------
function cleanPdfText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Semantic chunking:
 * - No word breaks
 * - Sentence-aware
 * - Embedding friendly
 */
function chunkText(text: string, maxLength = 400) {
  const normalized = text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const sentences = normalized.split(/(?<=[.!?])\s+/)

  const chunks: string[] = []
  let current = ""

  for (const sentence of sentences) {
    // Very long sentence → split by words safely
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current.trim())
        current = ""
      }

      let temp = ""
      for (const word of sentence.split(" ")) {
        if ((temp + " " + word).length > maxLength) {
          chunks.push(temp.trim())
          temp = word
        } else {
          temp += " " + word
        }
      }
      if (temp.trim()) chunks.push(temp.trim())
      continue
    }

    // Normal merge
    if ((current + " " + sentence).length > maxLength) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += " " + sentence
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}

// -----------------------------
// API
// -----------------------------
export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file uploaded" },
      { status: 400 }
    )
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { success: false, error: "Only PDFs supported" },
      { status: 400 }
    )
  }

  // -----------------------------
  // Parse PDF
  // -----------------------------
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let rawText = ""
  let cleanText = ""

  try {
    const parse = require("pdf-parse-fork")
    const data = await parse(buffer)
    rawText = data.text
    cleanText = cleanPdfText(rawText)
  } catch (err) {
    console.error("PDF parse error:", err)
    return NextResponse.json(
      { success: false, error: "PDF parsing failed" },
      { status: 500 }
    )
  }

  // -----------------------------
  // TEMP USER (until auth)
  // -----------------------------
  const userId = crypto.randomUUID()

  await prisma.user.upsert({
    where: { email: "dev@test.com" },
    update: {},
    create: {
      id: userId,
      email: "dev@test.com",
      name: "Dev User",
    },
  })

  // -----------------------------
  // Save Document
  // -----------------------------
  const document = await prisma.document.create({
    data: {
      name: file.name,
      type: file.type,
      user_id: userId,
    },
  })

  // -----------------------------
  // Chunk & Store
  // -----------------------------
  const chunks = chunkText(cleanText)

  await prisma.$transaction(
    chunks.map(chunk =>
      prisma.$executeRaw`
        INSERT INTO "DocumentChunk" (id, content, document_id)
        VALUES (${crypto.randomUUID()}::uuid, ${chunk}, ${document.id}::uuid)
      `
    )
  )

  // -----------------------------
  // Response
  // -----------------------------
  return NextResponse.json({
    status: "ok",
    data: {
      document: {
        id: document.id,
        name: file.name,
        type: file.type,
        size: file.size,
        chunks: chunks.length,
      },
      processing: {
        steps: ["uploaded", "parsed", "cleaned", "chunked", "stored"],
        timestamp: new Date().toISOString(),
      },
      stats: {
        rawLength: rawText.length,
        cleanLength: cleanText.length,
      },
      preview: chunks.slice(0, 3),
    },
  })
}
