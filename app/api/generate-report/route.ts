import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const REMOTE_GUARDING_CHECKLIST = [
  { id: 'activity', label: 'Activity As Seen' },
  { id: 'talkdowns', label: 'Talkdowns' },
  { id: 'confirmation_calls', label: 'Confirmation Calls' },
  { id: 'dispatch', label: 'Dispatch Call' },
  { id: 'spoc_update', label: 'SPOC Update Post-Dispatch' },
  { id: 'police_arrival', label: 'Police Arrival' },
  { id: 'followup_call', label: 'Follow-Up Call' },
  { id: 'final_status', label: 'Final Status of Subject' },
  { id: 'delay', label: 'Delay Clarification' },
]

const SCAN_CHECKLIST = [
  { id: 'activity', label: 'Activity As Seen' },
  { id: 'talkdown', label: 'Talkdown' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'guard_arrival', label: 'Guard Arrival' },
  { id: 'subject_status', label: 'Status of Subjects' },
  { id: 'spoc_informed', label: 'SPOC Informed' },
]

const EXAMPLE_REPORT = `A male subject was observed trespassing on the property via camera D10 (1st Floor Elevators). Two talkdowns were conducted. The San Antonio Police Department was contacted, and officers were dispatched (Badge ID: Dallas; Call Reference No.: 723). SPOC Ryan Franco (Manager), Veronica O., and Larry Johnson were informed via voicemail. Law enforcement was observed arriving on the property at 18:21 MST. Upon continued monitoring of the live footage, the subject was seen being handcuffed by officers. At 19:00 MST, a follow-up call was placed to the San Antonio Police Department. The dispatcher (Cassey) confirmed that the individual had been detained. The officers subsequently escorted the individual off the property.`

export async function POST(req: NextRequest) {
  try {
    const { notes, mode, previousReport } = await req.json()

    if (!notes) {
      return NextResponse.json({ error: 'No notes provided' }, { status: 400 })
    }

    const checklist = mode === 'remote_guarding' ? REMOTE_GUARDING_CHECKLIST : SCAN_CHECKLIST
    const checklistItems = checklist.map(item => `- ${item.label}`).join('\n')
    const previousContext = previousReport ? `\nPrevious version of report (operator is adding more details):\n${previousReport}\n` : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a professional security operations report writer. Convert the operator's rough notes into a polished incident report.

MODE: ${mode === 'remote_guarding' ? 'Remote Guarding' : 'Scan Monitoring'}
${previousContext}
OPERATOR NOTES:
${notes}

CRITICAL ANTI-FABRICATION RULES — NEVER VIOLATE:
1. NEVER invent, assume, or add ANY detail not explicitly stated in the notes
2. NEVER guess badge IDs, names, times, reference numbers, or camera IDs
3. NEVER add outcomes, responses, or results that the operator did not mention
   - If notes say "two talkdowns" do NOT add "no response was received" unless the operator said that
   - If notes say "SPOC notified" do NOT say how (call/text/voicemail) unless the operator said that
4. If information is missing, write [MISSING: field name] exactly like that
5. If something is unclear, write [UNCLEAR - OPERATOR TO VERIFY]
6. If you detect a contradiction, write [CONTRADICTION DETECTED - PLEASE REVIEW]

MISSING FLAG RULES — these specific fields MUST be flagged if not stated:
- Time of observation → [MISSING: time of observation] — always flag if no time given
- NEVER flag date — date is not required in these reports
- SPOC contact method → if SPOC is mentioned but call/text/voicemail is not stated → [MISSING: SPOC contact method]
- Badge ID → if dispatch is mentioned but badge ID not given → [MISSING: Badge ID]
- Call reference number → if dispatch is mentioned but reference number not given → [MISSING: Call Reference No.]
- Follow-up call details → if not mentioned → [MISSING: follow-up call details]
- Police arrival time → if police arrival is mentioned but no exact time given → [MISSING: police arrival time]
- Police department name → if dispatch is mentioned but the name of the police department is not stated → [MISSING: police department name]

VOICE RULES:
- Always use passive or impersonal constructions — never reveal an operator is acting
- CORRECT: "The police was contacted", "Two talkdowns were conducted", "SPOC was notified"
- WRONG: "The operator called", "The operator conducted", "The operator notified"

FORMAT RULES:
- Flowing paragraphs only — NO section headers, NO labels, NO bullet points
- NO title at the top
- NO date line, NO time line, NO camera line, NO operator line at the top
- Start directly with what was observed: "A [subject] was observed..."
- Third-person professional language throughout
- 24-hour clock always — write 18:21 MST not 6:21 PM MST

EXAMPLE OF PERFECT OUTPUT:
${EXAMPLE_REPORT}

CHECKLIST (only mark present if explicitly in notes):
${checklistItems}

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "report": "The full polished report as flowing paragraphs only",
  "checklist": {
    ${checklist.map(item => `"${item.id}": { "present": true/false, "note": "brief note or empty string" }`).join(',\n    ')}
  }
}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Report generation failed. Please try again.' }, { status: 500 })
  }
}