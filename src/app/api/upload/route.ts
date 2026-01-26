import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const formData = await req.formData()
    const file = formData.get("file") as File

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ""

    if (!file) {
        return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
        return NextResponse.json({ success: false, error: "Only PDFs supported" }, { status: 400 })
    }


    if (file.type === "application/pdf") {
        try {
            // Use pdf-parse-fork which works better with Next.js
            const parse = require("pdf-parse-fork")
            const data = await parse(buffer)
            text = data.text
        } catch (error: any) {
            console.error("PDF Parse Error:", error)
            return NextResponse.json({
                success: false,
                error: error.message || "Failed to parse PDF"
            }, { status: 500 })
        }
    }

    return NextResponse.json({
        success: true,
        textLength: text.length,
        preview: text.slice(0, 500)
    })

}