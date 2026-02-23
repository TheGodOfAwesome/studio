'use server';
/**
 * @fileOverview Identifies the top 5 most engaging segments in a podcast transcript based on user interests.
 *
 * - podcastHighlightIdentification - A function that handles the podcast highlight identification process.
 * - PodcastHighlightIdentificationInput - The input type for the podcastHighlightIdentification function.
 * - PodcastHighlightIdentificationOutput - The return type for the podcastHighlightIdentification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const PodcastHighlightIdentificationInputSchema = z.object({
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
  highlight_name: z.string().describe('A unique name for the highlight, such as "highlight_1", "highlight_2", etc.'),
  hook_caption: z.string().max(150).describe('A concise and engaging caption for the segment, no more than 10 words, designed to attract listeners.'),
})).max(5).describe('An array of up to 5 identified engaging podcast segments, ordered by perceived relevance/engagement.');
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
  prompt: `You are an expert podcast analyst. Your task is to identify the top 5 most engaging and coherent segments from the provided podcast transcript that are relevant to the user's interests.

Each identified highlight should represent a complete thought, anecdote, or story. To achieve this, you should combine consecutive transcript segments. A good highlight is typically between 30 and 90 seconds. Avoid creating very short or fragmented clips.

For each highlight, provide:
1.  The \`start_time\` from the first segment of the highlight.
2.  The \`end_time\` from the last segment of the highlight.
3.  A unique \`highlight_name\` (e.g., "highlight_1").
4.  A concise and compelling \`hook_caption\` (10 words or less) to attract listeners.

Strictly adhere to the following rules:
-   Ensure the identified segments are continuous and make sense as a standalone clip.
-   The "start_time" and "end_time" must precisely match the timestamps from the provided transcript segments.
-   The output must be a JSON array of objects, strictly conforming to the output schema provided.

User Interests:
{{#each interests}}
- {{this}}
{{/each}}

Podcast Transcript Segments (format: START_TIME-END_TIME: TEXT):
{{#each transcript}}
{{startTime}}-{{endTime}}: {{text}}
{{/each}}

Please provide the output in JSON format.`
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
