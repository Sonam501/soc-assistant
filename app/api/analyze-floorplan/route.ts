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
                media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: image,
              },
            },
            {
              type: 'text',
              text: `You are a security operations analyst reading a property floorplan or aerial map for dispatch purposes. ${cameraContext}

Before producing your final JSON, work through these steps internally:

STEP 1 - COMPASS: Find the compass rose anywhere on the image. Note exactly which direction the N arrow points on screen (e.g. upper-left, straight up, upper-right). If tilted, treat that tilt as true north. If no compass found, assume N is straight up.

STEP 2 - BOUNDARY: Identify any visible boundary lines (red lines, fence lines, perimeter markings). These define the property. If none visible, use the image edges.

STEP 3 - PROPERTY CENTER: Find the approximate center point of the property boundary. All directions are relative to this center.

STEP 4 - LOCATE CAMERA: Find the camera marker for "${cameraName || 'the requested camera'}". Camera markers may be arrows, dots, circles, pins, or labeled points. Note its position relative to the property center on screen. NEVER use the camera label name or nearby street names to determine direction.

STEP 5 - NORMALIZE AND CALCULATE: Mentally rotate the map so the compass N arrow points straight up. After rotation: up=N, down=S, right=E, left=W. Now determine which portion of the property the camera sits in relative to center. Choose one of: N, S, E, W, NE, NW, SE, SW.

STEP 6 - NEAREST ENTRANCE: Use this exact logic to determine the nearest entrance:
- First, identify all roads and streets visible on the map and their labels
- Then, for each visible road, look along the edge of the property boundary where it meets that road
- Look for any gap, opening, driveway, pathway, or break in the boundary line where vehicles or people could enter from that road
- Any such opening where the property boundary meets a road is an entrance
- Only label something as an entrance if there is a clear visible opening or gap on a road — not just a road being nearby
- If the opening is also labeled (e.g. "Entrance Gate", "Exit", "Main Entry"), include that label
- The nearest entrance to the camera is the one closest to the camera marker on the map
- If no clear opening can be confirmed, say "Cannot confirm"

RULES:
- Only state what is clearly visible in the image
- Never fabricate street names, addresses, or details
- If something cannot be confirmed, say "Cannot confirm"
- You MUST respond with valid JSON only, no other text before or after

Respond ONLY with valid JSON in exactly this format:
{
  "cameraFound": true or false,
  "cameraLabel": "The exact label or number shown on the map for this camera, or Cannot confirm",
  "direction": "Camera location on property based on compass normalization (N/S/E/W/NE/NW/SE/SW only)",
  "nearestEntrance": "The nearest entrance to this camera — describe which road it is on and where the property opens onto that road",
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

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Floorplan analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}