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

    /* ------------------------------
       STEP 1: REASONING CALL
       ------------------------------ */

    const reasoningCall = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
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

Follow these steps carefully.

STEP 1 — COMPASS DETECTION
Look carefully for a compass rose anywhere in the image.

Describe:
• Where it is located on screen (top-left, bottom-left, etc)
• Which direction the N arrow is pointing on the screen
• Whether the compass is tilted

Write clearly:
"The compass N arrow points toward [screen direction]."

If no compass exists, assume north is straight up.

---

STEP 2 — PROPERTY BOUNDARY

Look for any visible boundary markers such as:

• red perimeter lines
• fences
• walls
• lot edges
• property outlines

Describe the shape of the property and which parts of the screen represent:

top edge  
bottom edge  
left edge  
right edge  

---

STEP 3 — PROPERTY CENTER

Estimate the approximate center of the property boundary.

All directions must be calculated relative to this center point.

---

STEP 4 — CAMERA LOCATION

Locate the camera marker for "${cameraName || 'all cameras'}".

Camera markers may appear as:

• arrows
• camera icons
• dots
• labeled points

Ignore the camera label text when determining direction.

Describe the camera's position relative to the property center:

examples:
• upper-left area
• right side
• lower-middle
• center-left

---

STEP 5 — NORMALIZE MAP ORIENTATION

Before calculating direction, mentally rotate the map so the compass N arrow points straight up.

After this rotation the map should follow:

Up = North  
Down = South  
Right = East  
Left = West  

---

STEP 6 — FINAL DIRECTION

Using the rotated orientation and the camera's position relative to the property center:

Determine the direction of the camera.

Possible answers:

N  
S  
E  
W  
NE  
NW  
SE  
SW  

Write exactly:

"Therefore the camera is located in the [direction] portion of the property."

Show all reasoning.`,
            },
          ],
        },
      ],
    })

    const reasoning =
      reasoningCall.content[0].type === 'text'
        ? reasoningCall.content[0].text
        : ''

    /* ------------------------------
       STEP 2: FINAL JSON OUTPUT
       ------------------------------ */

    const jsonCall = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 800,
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
              text: `You are generating structured dispatch information.

The map has already been analyzed and the reasoning below is the ground truth.

Do NOT reinterpret the image again.

--- REASONING ---
${reasoning}
---

Using only the reasoning above, produce the final structured output.

Rules:
• Never fabricate street names or addresses
• Only report what is visible
• If unknown say "Cannot confirm"
• Direction must match exactly what Step 6 concluded

Respond ONLY with valid JSON in this format:

{
  "cameraFound": true,
  "cameraLabel": "Exact label or Cannot confirm",
  "direction": "N/S/E/W/NE/NW/SE/SW",
  "nearestEntrance": "Nearest visible entrance or Cannot confirm",
  "closestCrossStreet": "Closest cross street or Cannot confirm",
  "streetAddress": "Any visible address or Cannot confirm",
  "additionalDetails": "Useful map landmarks",
  "dispatchSummary": "One professional sentence describing the camera location for police dispatch."
}`,
            },
          ],
        },
      ],
    })

    const text =
      jsonCall.content[0].type === 'text'
        ? jsonCall.content[0].text
        : ''

    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Floorplan analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}