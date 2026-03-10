import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType, cameraName } = await req.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const cameraContext = cameraName ? `The image is from: ${cameraName}.` : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `You are a security operations analyst. Analyze this image and extract subject description details for an incident report. ${cameraContext}

CRITICAL RULES:
- Never guess or assume. If something is unclear, say "Cannot confirm"
- Never invent details not visible in the image
- Be factual and observational only
- Use professional security report language

Respond ONLY with a valid JSON object in exactly this format:
{
  "subjectType": "Human / Vehicle / Animal / Object",
  "gender": "Male / Female / Cannot confirm",
  "ethnicity": "Description or Cannot confirm",
  "heightBuild": "Estimated height and build or Cannot confirm",
  "headHair": "Hair color, style, headwear description or Cannot confirm",
  "upperBody": "Clothing color, type, description",
  "lowerBody": "Pants/shorts/skirt color and type",
  "footwear": "Shoe type and color or Cannot confirm",
  "objects": "Any bags, weapons, items carried or None visible",
  "activity": "What the subject is doing",
  "reportSentence": "A single professional third-person sentence summarizing the subject for an incident report"
}`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Snapshot analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}