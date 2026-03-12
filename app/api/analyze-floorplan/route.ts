import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function calculateDirection(compass: string, cameraPos: string) {
  // Normalize compass
  const compassMap: Record<string, number> = {
    up: 0,
    'upper-right': 45,
    right: 90,
    'lower-right': 135,
    down: 180,
    'lower-left': 225,
    left: 270,
    'upper-left': 315,
  }

  const cameraMap: Record<string, number> = {
    top: 0,
    'top-right': 45,
    right: 90,
    'bottom-right': 135,
    bottom: 180,
    'bottom-left': 225,
    left: 270,
    'top-left': 315,
  }

  const compassAngle = compassMap[compass] ?? 0
  const cameraAngle = cameraMap[cameraPos] ?? 0

  const relative = (cameraAngle - compassAngle + 360) % 360

  if (relative < 22.5 || relative >= 337.5) return 'N'
  if (relative < 67.5) return 'NE'
  if (relative < 112.5) return 'E'
  if (relative < 157.5) return 'SE'
  if (relative < 202.5) return 'S'
  if (relative < 247.5) return 'SW'
  if (relative < 292.5) return 'W'
  return 'NW'
}

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType, cameraName } = await req.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const imageSource = {
      type: 'base64' as const,
      media_type: (mediaType || 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/webp',
      data: image,
    }

    /* ------------------------------
       CALL 1: VISION DETECTION ONLY
    ------------------------------ */

    const detectionCall = await client.messages.create({
      model: 'claude-sonnet-4',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: imageSource },
            {
              type: 'text',
              text: `Analyze this map.

Return ONLY JSON in this format:

{
 "compassDirectionOnScreen": "up | upper-right | right | lower-right | down | lower-left | left | upper-left",
 "cameraScreenPosition": "top | top-right | right | bottom-right | bottom | bottom-left | left | top-left",
 "cameraLabel": "exact label if visible or Cannot confirm"
}

Rules:
- compassDirectionOnScreen = direction the N arrow points on the screen
- cameraScreenPosition = where the camera appears relative to the image center
- Do NOT calculate property direction
- Do NOT guess directions like N/E/S/W
- Only describe visual positions on screen`,
            },
          ],
        },
      ],
    })

    const detectionText =
      detectionCall.content[0].type === 'text'
        ? detectionCall.content[0].text
        : ''

    const cleaned = detectionText.replace(/```json|```/g, '').trim()
    const detection = JSON.parse(cleaned)

    /* ------------------------------
       CALCULATE DIRECTION IN CODE
    ------------------------------ */

    const direction = calculateDirection(
      detection.compassDirectionOnScreen,
      detection.cameraScreenPosition
    )

    /* ------------------------------
       CALL 2: DISPATCH SUMMARY
    ------------------------------ */

    const summaryCall = await client.messages.create({
      model: 'claude-sonnet-4',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Write a dispatch sentence.

Camera label: ${detection.cameraLabel}
Direction: ${direction}

Respond with one professional sentence describing the camera location for police dispatch.`,
            },
          ],
        },
      ],
    })

    const summary =
      summaryCall.content[0].type === 'text'
        ? summaryCall.content[0].text
        : ''

    return NextResponse.json({
      cameraFound: true,
      cameraLabel: detection.cameraLabel,
      direction,
      nearestEntrance: 'Cannot confirm',
      closestCrossStreet: 'Cannot confirm',
      streetAddress: 'Cannot confirm',
      additionalDetails: 'Derived from map analysis',
      dispatchSummary: summary,
    })
  } catch (error) {
    console.error('Floorplan analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}