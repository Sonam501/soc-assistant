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
      : 'The operator has not specified a camera. Describe all visible cameras and general layout.'

    const imageSource = {
      type: 'base64' as const,
      media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: image,
    }

    // CALL 1 — Step-by-step reasoning to lock in compass orientation and camera position
    const reasoningCall = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
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

Work through every step carefully and write out your full reasoning.

STEP 1 — FIND THE COMPASS:
Scan the entire image for a compass rose or any directional indicator.
- Where is it located on the image? (e.g. bottom-left corner, top-right corner)
- Which direction is the N arrow physically pointing on screen? (e.g. straight up, toward upper-left, toward upper-right)
- Is the compass tilted at an angle? Describe it precisely.
- Write exactly: "The compass N arrow points toward [screen direction]"
- If no compass is visible anywhere, write: "No compass found. Assuming N is straight up."

STEP 2 — IDENTIFY PROPERTY BOUNDARY:
- Are there any visible boundary lines on this map? (red lines, fence lines, drawn outlines, perimeter markings)
- If yes, describe where the boundary edges are on screen (e.g. "boundary runs along the top, left and bottom of the image, with Central Ave forming the right edge")
- If no boundary lines are visible, use the full image edges as the property boundary.

STEP 2.5 — PROPERTY CENTER:
- Based on the boundary identified in Step 2, determine the approximate center point of the property.
- Describe where the center is on screen (e.g. "center is roughly in the middle of the image, slightly left of center")
- All direction calculations must be made relative to this center point.

STEP 3 — LOCATE THE CAMERA:
- Locate the camera marker that corresponds to "${cameraName || 'the requested camera'}".
- Camera markers may appear as arrows, dots, circles, pins, or labeled points on the map.
- CRITICAL: Ignore the camera label name completely when determining position. A camera called "West Lot" may not be on the west side.
- CRITICAL: Ignore nearby street names when determining position.
- Describe exactly where the camera marker is on screen relative to the property boundary and center point.
- Example: "The camera marker is in the upper-right area of the property, above and to the right of the property center"

STEP 4 — NORMALIZE MAP ORIENTATION:
Mentally rotate the entire map so that the compass N arrow from Step 1 is pointing straight up.
After this mental rotation:
- Up = North
- Down = South  
- Right = East
- Left = West
- Upper-right = NE, Upper-left = NW, Lower-right = SE, Lower-left = SW

Now apply this normalized orientation to the camera's position relative to the property center.

STEP 5 — FINAL DIRECTION:
Based on Steps 3 and 4, determine where the camera sits relative to the property center in the normalized orientation.
Write exactly: "Therefore the camera is located in the [N/S/E/W/NE/NW/SE/SW] portion of the property."

Be precise and thorough. Show all reasoning clearly.`,
            },
          ],
        },
      ],
    })

    const reasoning = reasoningCall.content[0].type === 'text' ? reasoningCall.content[0].text : ''

    // CALL 2 — Use reasoning as ground truth, produce final JSON only
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
              text: `You are a security operations analyst producing dispatch information for a floorplan or aerial map. ${cameraContext}

A thorough step-by-step analysis of this map has already been completed. Here is that reasoning:

---
${reasoning}
---

CRITICAL: Do NOT reinterpret the map or recalculate directions. Use the reasoning above as absolute ground truth for the direction field. Only use the image now to extract visible text labels such as street names, entrance labels, and addresses.

Rules:
- Only state what is clearly visible in the image
- Never fabricate street names, addresses, or details not visible
- If something cannot be confirmed from the image, say "Cannot confirm"
- For "direction" — copy EXACTLY what Step 5 of the reasoning concluded. Do not change it.

Respond ONLY with valid JSON in exactly this format:
{
  "cameraFound": true or false,
  "cameraLabel": "The exact label or number shown on the map for this camera, or Cannot confirm",
  "direction": "The exact direction from Step 5 of the reasoning (N/S/E/W/NE/NW/SE/SW only)",
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