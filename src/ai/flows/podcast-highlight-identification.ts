'use server';
/**
 * @fileOverview Identifies 5 to 10 of the most engaging segments in a podcast transcript based on user interests.
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
  highlight_name: z.string().describe('A unique name for the highlight, in the format "Highlight N - <Podcast Title>", e.g., "Highlight 1 - Startup Realities".'),
  hook_caption: z.string().max(150).describe('A concise and engaging caption for the segment, no more than 15 words, designed to attract listeners.'),
})).min(5).max(10).describe('An array of 5 to 10 identified engaging podcast segments, ordered by perceived relevance/engagement.');
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
  prompt: 
  'You are an expert podcast editor with years of experience creating viral clips. Your task is to identify between 5 and 10 highlights from the provided podcast transcript that are relevant to the user\'s interests.\n\n## CRITICAL: Read Everything First\nBefore doing anything else, read the ENTIRE transcript from start to finish. You must understand the full conversation before selecting any highlights. Do not start selecting until you have read every single segment.\n\n## Step 1 - Map the Conversation Into Topics\nAfter reading the full transcript, mentally divide the conversation into its major topics or segments. A new topic begins when the speakers shift to a clearly different subject. Write out these topics in your reasoning before proceeding.\n\n## Step 2 - Identify Candidate Highlights\nFor each major topic, ask yourself:\n- Where does this topic ACTUALLY begin? (not where a keyword appears, but where the speaker first sets up the context or question)\n- Where does this topic ACTUALLY end? (the last sentence of the conclusion, not the first sentence of a new topic)\n- Is this a COMPLETE story? It must have: a setup, a body, and a clear ending. If any of these are missing, expand the boundaries until they are present.\n\n## Step 3 - Validate Each Highlight With These Checks\nBefore finalizing any highlight, verify ALL of the following:\n[ ] The clip starts at the very beginning of a complete sentence — never mid-sentence or mid-thought.\n[ ] The clip ends at the very end of a complete sentence — never mid-sentence or mid-thought.\n[ ] The last line of the clip feels like a natural stopping point (a conclusion, a punchline, a lesson learned, or a clear pause in the topic).\n[ ] The clip contains at minimum 10 consecutive transcript segments.\n[ ] The duration is between 120 and 300 seconds. If it is below 120 seconds, you MUST expand it by including the segments immediately before or after.\n[ ] If you cut the clip and played it to someone with no context, would it feel complete and satisfying? If not, expand it.\n\n## Step 4 - Select the Best Highlights\nFrom your validated candidates, select those most relevant to the user\'s interests below.\n\n## Absolute Rules\n- A clip that cuts off a speaker mid-sentence is invalid. Discard it and re-select.\n- A clip that starts mid-story without proper setup is invalid. Discard it and re-select.\n- Never select a clip shorter than 120 seconds.\n- Highlights must not overlap.\n- `start_time` and `end_time` must exactly match timestamps from the transcript.\n- Output must be a JSON array conforming to the output schema.\n\n---\n\nPodcast Title: {{podcastTitle}}\n\nUser Interests:\n{{#each interests}}\n- {{this}}\n{{/each}}\n\nPodcast Transcript Segments (format: START_TIME-END_TIME: TEXT):\n{{#each transcript}}\n{{startTime}}-{{endTime}}: {{text}}\n{{/each}}\n\nFirst, write out your topic map and reasoning for each highlight selection. Then provide the final output as a JSON array.'
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
