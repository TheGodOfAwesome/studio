'use server';
/**
 * @fileOverview Identifies 1 to 7 of the most engaging segments in a podcast transcript based on user interests.
 *
 * - podcastHighlightIdentification - A function that handles the podcast highlight identification process.
 * - PodcastHighlightIdentificationInput - The input type for the podcastHighlightIdentification function.
 * - PodcastHighlightIdentificationOutput - The return type for the podcastHighlightIdentification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const PodcastHighlightIdentificationInputSchema = z.object({
  podcastTitle: z.string().describe('The title of the podcast episode.'),
  transcript: z.array(z.object({
    text: z.string().describe('The transcribed text of a segment.'),
    startTime: z.string().describe('The start time of the segment in the audio, e.g., "00:01:23".'),
    endTime: z.string().describe('The end time of the segment in the audio, e.g., "00:01:45".'),
  })).describe('The full podcast transcript, segmented with timestamps. Each segment includes its text, start time, and end time.'),
  interests: z.array(z.string()).describe('A list of user interests to consider when identifying engaging segments. The LLM should prioritize segments relevant to these interests.'),
});
export type PodcastHighlightIdentificationInput = z.infer<typeof PodcastHighlightIdentificationInputSchema>;

// Output Schema
const PodcastHighlightIdentificationOutputSchema = z.array(z.object({
  start_time: z.string().describe('The start time of the engaging segment in the audio, matching the format from the transcript input (e.g., "00:01:23").'),
  end_time: z.string().describe('The end time of the engaging segment in the audio, matching the format from the transcript input (e.g., "00:01:45").'),
  highlight_name: z.string().describe('A unique name for the highlight, in the format "Highlight [Number] - <Podcast Title>", e.g., "Highlight 1 - Startup Realities".'),
  hook_caption: z.string().max(100).describe('A punchy, clickbaity, and curiosity-driven hook (3 to 8 words) that makes the listener desperate to hear the segment.'),
})).min(1).max(7).describe('An array of 1 to 7 identified engaging podcast segments, ordered by perceived relevance/engagement.');
export type PodcastHighlightIdentificationOutput = z.infer<typeof PodcastHighlightIdentificationOutputSchema>;

// Wrapper function for the flow
export async function podcastHighlightIdentification(input: PodcastHighlightIdentificationInput): Promise<PodcastHighlightIdentificationOutput> {
  return podcastHighlightIdentificationFlow(input);
}

// Genkit Prompt Definition
const podcastHighlightPrompt = ai.definePrompt({
  name: 'podcastHighlightPrompt',
  input: { schema: PodcastHighlightIdentificationInputSchema },
  output: { schema: PodcastHighlightIdentificationOutputSchema },
  prompt: `You are an expert podcast producer and content curator. Your task is to analyze a timestamped podcast transcript and extract the most compelling, highly impactful segments.

### Objective
Identify the best highlight segments based first on a provided list of "User Interests". If the transcript does not contain enough content matching these interests, fill the remaining quota by identifying the best general insights, observations, anecdotes, philosophies, mental models, frameworks, and stories.

### Rules for Extraction
1. **Contextual Completeness (Crucial):** Ensure the start and end times capture the complete arc of a thought, story, or framework. Do not start mid-sentence or end before the final payoff/conclusion of the narrative. The \`start_time\` and \`end_time\` must exactly match timestamps from the provided transcript segments.
2. **Length Constraints:** Highlights should be as long as necessary to capture the full arc, but must strictly remain under a 9-minute maximum limit per segment.
3. **Quantity:** Aim for an average of 5 highlights. Let the actual number of high-quality moments dictate the final count, but absolutely do not exceed 7 highlights.
4. **Prioritization:** Always prioritize segments that align with the "User Interests". Use general impactful anecdotes only as a fallback.
5. **Hook Caption:** Write a punchy, clickbaity, and curiosity-driven hook (6 - 10 words) that makes the listener desperate to hear the segment (e.g., "The dark truth behind Think and Grow Rich" instead of "History of Napoleon Hill").
6. **Highlight Naming:** Follow the format exactly: "Highlight [Number] - [Podcast Title]".

### Inputs
- **Podcast Title:** {{podcastTitle}}
- **User Interests:**
{{#each interests}}
- {{this}}
{{/each}}
- **Transcript (format: START_TIME-END_TIME: TEXT):**
{{#each transcript}}
{{startTime}}-{{endTime}}: {{text}}
{{/each}}

### Output Format
Respond ONLY with a valid, raw JSON array of highlight objects matching the output schema. Do not include introductory text, conversational filler, or markdown blocks (like \`\`\`json).`,
});

// Genkit Flow Definition
const podcastHighlightIdentificationFlow = ai.defineFlow(
  {
    name: 'podcastHighlightIdentificationFlow',
    inputSchema: PodcastHighlightIdentificationInputSchema,
    outputSchema: PodcastHighlightIdentificationOutputSchema,
  },
  async (input) => {
    const {output} = await podcastHighlightPrompt(input);
    return output!;
  }
);
