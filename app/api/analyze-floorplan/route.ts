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
      ? `The operator is asking specifically about camera: "${cameraName}". Focus your analysis on locating and describing this camera.`
      : 'The operator has not specified a camera. Describe all visible cameras and general layout.'

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
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
              text: `You are a security operations analyst reading a property floorplan or aerial map for dispatch purposes. ${cameraContext}

CRITICAL RULES:
- Only state what is clearly visible in the image
- Never guess or fabricate street names, directions, or camera positions
- If something cannot be confirmed from the image, say "Cannot confirm"
- Be specific and useful for a dispatcher describing a location to police

PROPERTY BOUNDARY RULE:
- If the map shows visible boundary lines (red lines, fence lines, drawn outlines, or any marked perimeter), those lines define the property
- Only consider cameras and features INSIDE the boundary as part of the property
- Ignore any cameras, icons, or labels that fall outside the boundary lines
- Use the boundary edges (not the image edges) to determine north/south/east/west positions within the property

COMPASS RULES — READ CAREFULLY:
- Always look for a compass rose anywhere on the map before doing anything else
- If a compass rose is present, it is the absolute ground truth for direction — use it exactly as drawn
- If the compass rose is tilted at an angle, treat that tilted angle as true north — do NOT straighten it or assume north is up
- Example: if the N arrow on the compass points toward the upper-left of the image, then upper-left IS north for this map
- All camera position directions must be calculated based on the compass as it actually appears, including any tilt
- If NO compass rose is visible anywhere on the map, only then assume north is up (standard map convention)

FOR THE "direction" FIELD — CRITICAL:
- "direction" means WHERE ON THE PROPERTY the camera is physically located, relative to the compass
- Use the compass (with tilt accounted for) to determine the camera's position within the property boundary
- Example: camera in the bottom-left corner, compass shows SW is bottom-left → direction is "SW"
- Example: compass is tilted so north points upper-left, camera is in upper-right → direction is "SE"
- DO NOT use the direction the camera lens is pointing — use the camera's POSITION on the property
- CRITICAL: NEVER use the camera label name or text to determine direction — a camera called "West Lot" may not be on the west side of the property. Only use the camera's VISUAL POSITION on the map relative to the compass
- CRITICAL: NEVER use nearby street names to determine direction — a camera near "Central Ave" on the right side of the map is not necessarily east if the compass says otherwise
- Always return one of: N, S, E, W, NE, NW, SE, SW

Respond ONLY with valid JSON in exactly this format:
{
  "cameraFound": true or false,
  "cameraLabel": "The exact label or number shown on the map for this camera, or Cannot confirm",
  "direction": "Where on the property the camera is located based on compass (N/S/E/W/NE/NW/SE/SW only)",
  "nearestEntrance": "The nearest entrance or exit to this camera based on the map",
  "closestCrossStreet": "The closest cross street or intersection visible on the map, or Cannot confirm",
  "streetAddress": "Any address or street names visible on the map near this camera",
  "additionalDetails": "Any other useful dispatch details visible on the map such as parking areas, building names, landmarks, gate numbers",
  "dispatchSummary": "A single professional sentence describing the camera location for use during police dispatch. Example: Camera 05 is located at the Entrance Gate on Alessandro Blvd, at the north end of the property near the intersection of Alessandro Blvd and Day St."
}`
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