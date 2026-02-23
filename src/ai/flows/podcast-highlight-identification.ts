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
  'You are an expert podcast analyst and storyteller. Your task is to identify between 5 and 10 of the most engaging and coherent segments from the provided podcast transcript that are relevant to the user\'s interests.\n\n## Your Process (follow these steps in order)\n\n**Step 1 - Read the full transcript first.**\nBefore selecting anything, read all segments to understand the full arc of the conversation.\n\n**Step 2 - Identify complete stories, anecdotes, or thoughts.**\nA valid highlight must have ALL THREE of the following:\n- A clear **opening** (a question is asked, a topic is introduced, a story begins)\n- A clear **development** (the speaker elaborates, gives examples, builds tension)\n- A clear **resolution** (a conclusion, punchline, lesson, or natural pause in the topic)\n\nDo NOT select a segment that starts or ends in the middle of a thought. If someone is mid-sentence or mid-story at the boundary of a segment, extend the highlight until the thought is complete.\n\n**Step 3 - Merge consecutive segments.**\nHighlights should be formed by combining multiple consecutive transcript segments. A good highlight is typically 120–240 seconds but can be longer if necessary with a maximum of 300 seconds. Never select isolated single segments.\n\n**Step 4 - Filter by user interests.**\nFrom your identified complete stories, select those most relevant to the user\'s interests listed below.\n\n## Strict Rules\n- `start_time` must be the timestamp where the *topic or story genuinely begins*, not just where a keyword appears.\n- `end_time` must be the timestamp where the *thought is fully resolved*, not cut off mid-idea.\n- Highlights must not overlap.\n- The output must be a JSON array conforming to the output schema.\n\n---\n\nPodcast Title: {{podcastTitle}}\n\nUser Interests:\n{{#each interests}}\n- {{this}}\n{{/each}}\n\nPodcast Transcript Segments (format: START_TIME-END_TIME: TEXT):\n{{#each transcript}}\n{{startTime}}-{{endTime}}: {{text}}\n{{/each}}\n\nThink through your reasoning before producing the final JSON output. Then provide the output in JSON format.'
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
