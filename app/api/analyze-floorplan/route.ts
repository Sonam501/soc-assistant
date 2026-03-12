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

    const cameraContext = cameraName
      ? `The operator is asking specifically about camera: "${cameraName}".`
      : 'The operator has not specified a camera.'

    const imageSource = {
      type: 'base64' as const,
      media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: image,
    }

    // STEP 1: Reasoning call — force the AI to think through compass and position before answering
    const reasoningCall = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: imageSource,
            },
            {
              type: 'text',
              text: `You are analyzing a security floorplan or aerial map. ${cameraContext}

Work through these steps carefully and write your answers:

STEP 1 — COMPASS:
Look carefully at the entire image for a compass rose.
- Where exactly is it on the image? (top-left, bottom-left, etc.)
- Which direction is the N arrow actually pointing on screen? (straight up, upper-left, upper-right, etc.)
- Is the compass tilted? If so, describe the tilt angle.
- Write: "The compass N arrow points toward [direction on screen]"

STEP 2 — PROPERTY BOUNDARY:
- Are there any visible boundary lines (red lines, fence outlines, perimeter markings)?
- If yes, describe where the boundary is.
- What are the edges of the property on screen? (top, bottom, left, right edges of the bounded area)

STEP 3 — CAMERA LOCATION ON SCREEN:
- Find the camera labeled "${cameraName || 'all cameras'}".
- Ignore the camera's label name completely — do not use it for direction.
- Where is this camera icon VISUALLY on the screen? (top-left area, bottom-right area, center-left, etc.)
- Describe its position relative to the property boundary edges.

STEP 4 — DIRECTION CALCULATION:
- Using ONLY the compass N direction from Step 1 and the camera screen position from Step 3:
- If N points upper-left, then upper-left of property = N, lower-right = S, upper-right = E... wait, recalculate properly.
- Map out all 8 directions based on where N actually points.
- Then place the camera into one of those 8 directions based on its visual position.
- Write: "Therefore the camera is located in the [N/S/E/W/NE/NW/SE/SW] portion of the property"

Be precise and show all reasoning.`,
            },
          ],
        },
      ],
    })

    const reasoning = reasoningCall.content[0].type === 'text' ? reasoningCall.content[0].text : ''

    // STEP 2: JSON call — use the reasoning to produce final structured output
    const jsonCall = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: imageSource,
            },
            {
              type: 'text',
              text: `You are analyzing a security floorplan or aerial map for dispatch purposes. ${cameraContext}

A careful step-by-step analysis of this map has already been completed. Here is that reasoning:

---
${reasoning}
---

Using the above reasoning as your ground truth, now produce the final dispatch information.

Additional rules:
- Only state what is clearly visible in the image
- Never fabricate street names, addresses, or details not visible
- If something cannot be confirmed, say "Cannot confirm"
- For nearestEntrance, closestCrossStreet, streetAddress — look at the image carefully for visible labels
- For direction — use EXACTLY what the reasoning concluded in Step 4, do not recalculate

Respond ONLY with valid JSON in exactly this format:
{
  "cameraFound": true or false,
  "cameraLabel": "The exact label or number shown on the map for this camera, or Cannot confirm",
  "direction": "The direction from Step 4 of the reasoning (N/S/E/W/NE/NW/SE/SW only)",
  "nearestEntrance": "The nearest entrance or exit to this camera based on the map",
  "closestCrossStreet": "The closest cross street or intersection visible on the map, or Cannot confirm",
  "streetAddress": "Any address or street names visible on the map near this camera",
  "additionalDetails": "Any other useful dispatch details visible on the map such as parking areas, building names, landmarks, gate numbers",
  "dispatchSummary": "A single professional sentence describing the camera location for use during police dispatch."
}`,
            },
          ],
        },
      ],
    })

    const text = jsonCall.content[0].type === 'text' ? jsonCall.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Floorplan analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}