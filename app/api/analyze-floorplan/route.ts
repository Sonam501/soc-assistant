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

FOR THE "direction" FIELD — THIS IS CRITICAL:
- "direction" means WHERE ON THE PROPERTY the camera is physically located, based on the compass
- Use the compass rose on the map to orient yourself (N/S/E/W/NE/NW/SE/SW)
- Example: if the camera is in the bottom-left corner of the property and the compass shows south is down, the direction is "SW"
- Example: if the camera is at the top-right of the property and north is up, the direction is "NE"
- DO NOT use the direction the camera lens is pointing — use the camera's POSITION on the property relative to the compass
- If no compass rose is visible on the map, assume north is up (standard map convention) and determine position accordingly
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