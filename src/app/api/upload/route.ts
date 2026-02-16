import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SectionType } from "@prisma/client"

export const runtime = "nodejs"

// --------------------------------------------------
// TEXT CLEANING
// --------------------------------------------------

function cleanPdfText(text: string) {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\t+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/(\d)([A-Za-z])/g, "$1 $2")
        .replace(/([A-Za-z])(\d)/g, "$1 $2")
        .replace(/ +/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

// --------------------------------------------------
// HEADING DETECTION
// --------------------------------------------------

function isHeading(line: string) {
    const trimmed = line.trim()

    return (
        trimmed.length > 2 &&
        trimmed.length < 50 &&
        trimmed === trimmed.toUpperCase() &&
        !trimmed.includes(".") &&
        !trimmed.includes(",")
    )
}

// --------------------------------------------------
// SPLIT INTO RAW SECTIONS
// --------------------------------------------------

function splitIntoSections(text: string) {
    const lines = text.split("\n")

    const sections: { heading: string; content: string }[] = []

    let currentHeading = "GENERAL"
    let buffer: string[] = []

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        if (isHeading(line)) {
            if (buffer.length) {
                sections.push({
                    heading: currentHeading,
                    content: buffer.join(" ").trim(),
                })
            }

            currentHeading = line
            buffer = []
        } else {
            buffer.push(line)
        }
    }

    if (buffer.length) {
        sections.push({
            heading: currentHeading,
            content: buffer.join(" ").trim(),
        })
    }

    return sections
}

// --------------------------------------------------
// NORMALIZE HEADING → ENUM
// --------------------------------------------------

function normalizeHeading(heading: string): SectionType {
    const h = heading.toLowerCase()

    if (h.includes("summary") || h.includes("profile"))
        return "SUMMARY"

    if (h.includes("skill") || h.includes("technology"))
        return "SKILLS"

    if (
        h.includes("experience") ||
        h.includes("employment") ||
        h.includes("work") ||
        h.includes("internship")
    )
        return "EXPERIENCE"

    if (
        h.includes("project") ||
        h.includes("academic")
    )
        return "PROJECTS"

    if (h.includes("education"))
        return "EDUCATION"

    if (h.includes("certification"))
        return "CERTIFICATIONS"

    return "OTHER"
}

// --------------------------------------------------
// MAIN SECTION EXTRACTOR
// --------------------------------------------------

function extractSections(text: string) {
    const rawSections = splitIntoSections(text)

    return rawSections.map(section => ({
        type: normalizeHeading(section.heading),
        content: section.content,
    }))
}

// --------------------------------------------------
// SEMANTIC CHUNKING
// --------------------------------------------------

function chunkText(text: string, maxLength = 400) {
    const normalized = text
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    const sentences = normalized.split(/(?<=[.!?])\s+/)

    const chunks: string[] = []
    let current = ""

    for (const sentence of sentences) {
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

// --------------------------------------------------
// API ROUTE
// --------------------------------------------------

export async function POST(req: Request) {
    try {
        const formData = await req.formData()

        let file: File | null = null

        for (const [, value] of formData.entries()) {
            if (value instanceof File) {
                file = value
                break
            }
        }

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            )
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json(
                { error: "Only PDFs supported" },
                { status: 400 }
            )
        }

        // --------------------------------------------------
        // PARSE PDF
        // --------------------------------------------------

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const parse = require("pdf-parse-fork")
        const data = await parse(buffer)

        const rawText = data.text
        const cleanText = cleanPdfText(rawText)

        if (!cleanText) {
            return NextResponse.json(
                { error: "Could not extract text" },
                { status: 400 }
            )
        }

        // --------------------------------------------------
        // TEMP USER
        // --------------------------------------------------

        const user = await prisma.user.upsert({
            where: { email: "dev@test.com" },
            update: {},
            create: {
                id: crypto.randomUUID(),
                email: "dev@test.com",
                name: "Dev User",
            },
        })

        // --------------------------------------------------
        // EXTRACT SECTIONS
        // --------------------------------------------------

        const sections = extractSections(cleanText)

        // --------------------------------------------------
        // SAVE DOCUMENT + SECTIONS
        // --------------------------------------------------

        const document = await prisma.document.create({
            data: {
                name: file.name,
                type: file.type,
                user_id: user.id,
                sections: {
                    create: sections.map((s) => ({
                        type: s.type,
                        content: s.content,
                    })),
                },
            },
            include: {
                sections: true,
            },
        })

        // --------------------------------------------------
        // SECTION-WISE CHUNKING
        // --------------------------------------------------

        const sectionChunks: {
            sectionType: SectionType
            content: string
        }[] = []

        for (const section of sections) {
            const chunks = chunkText(section.content)

            for (const chunk of chunks) {
                sectionChunks.push({
                    sectionType: section.type,
                    content: chunk,
                })
            }
        }

        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return NextResponse.json({
            status: "ok",
            textLength: cleanText.length,
            totalSections: sections.length,
            totalChunks: sectionChunks.length,
            data: {
                documentId: document.id,
                filename: file.name,
                sections: document.sections,
                chunks: sectionChunks,
            },
        })
    } catch (error) {
        console.error("Upload error:", error)

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
