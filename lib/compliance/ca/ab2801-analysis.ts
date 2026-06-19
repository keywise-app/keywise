/**
 * AB 2801 AI Comparison Analysis
 *
 * Uses Claude vision to compare move-in vs move-out photos and identify
 * differences classified as DAMAGE, NORMAL_WEAR, CHANGE, or UNCLEAR.
 */

import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Classification = 'DAMAGE' | 'NORMAL_WEAR' | 'CHANGE' | 'UNCLEAR';

export interface Finding {
  room: string;
  description: string;
  classification: Classification;
  confidence: number; // 1-5
  moveInPhotoUrl: string;
  moveOutPhotoUrl: string;
}

export interface PhotoPair {
  room: string;
  moveInUrl: string;
  moveOutUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildComparisonPrompt(room: string): string {
  return [
    `Compare these two photos of "${room}".`,
    'The first image is the MOVE-IN photo (baseline condition).',
    'The second image is the MOVE-OUT photo (condition when tenant vacated).',
    '',
    'For each visible difference between the two photos:',
    '1. Describe what you observe.',
    '2. Classify as one of: DAMAGE | NORMAL_WEAR | CHANGE | UNCLEAR.',
    '   - DAMAGE: beyond ordinary wear and tear (e.g. holes, stains, burns, broken fixtures)',
    '   - NORMAL_WEAR: expected deterioration from normal use (e.g. minor scuffs, faded paint)',
    '   - CHANGE: neutral alteration, not damage (e.g. furniture rearranged, items removed)',
    '   - UNCLEAR: cannot confidently determine from photos alone',
    '3. Rate your confidence from 1 (very low) to 5 (very high).',
    '',
    'Do NOT make legal judgments about liability or deductions.',
    'Do NOT speculate about causes you cannot observe.',
    '',
    'Output valid JSON — an array of objects with keys: description, classification, confidence.',
    'If no differences are observed, return an empty array: []',
    '',
    'Example output:',
    '[',
    '  { "description": "Large stain on carpet near entrance, approximately 12 inches diameter", "classification": "DAMAGE", "confidence": 4 },',
    '  { "description": "Minor scuff marks on baseboard near door", "classification": "NORMAL_WEAR", "confidence": 3 }',
    ']',
  ].join('\n');
}

function parseFindings(
  raw: string,
  room: string,
  moveInUrl: string,
  moveOutUrl: string,
): Finding[] {
  // Extract JSON array from the response (handle markdown code fences)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed: { description: string; classification: Classification; confidence: number }[] =
      JSON.parse(jsonMatch[0]);

    return parsed.map((item) => ({
      room,
      description: item.description,
      classification: item.classification,
      confidence: Math.min(5, Math.max(1, Math.round(item.confidence))),
      moveInPhotoUrl: moveInUrl,
      moveOutPhotoUrl: moveOutUrl,
    }));
  } catch {
    console.error(`[ab2801-analysis] Failed to parse findings for ${room}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

/**
 * Compare move-in and move-out photos room by room using Claude vision.
 *
 * @param photoPairs - Array of { room, moveInUrl, moveOutUrl }
 * @returns Array of findings across all rooms
 */
export async function analyzeInspection(photoPairs: PhotoPair[]): Promise<Finding[]> {
  const client = new Anthropic();
  const allFindings: Finding[] = [];

  for (const pair of photoPairs) {
    const prompt = buildComparisonPrompt(pair.room);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6-20250620',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'url', url: pair.moveInUrl },
              },
              {
                type: 'image',
                source: { type: 'url', url: pair.moveOutUrl },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const findings = parseFindings(textBlock.text, pair.room, pair.moveInUrl, pair.moveOutUrl);
        allFindings.push(...findings);
      }
    } catch (err: any) {
      console.error(`[ab2801-analysis] Error analyzing ${pair.room}:`, err.message);
      // Continue to the next room — partial results are still useful
    }
  }

  return allFindings;
}
