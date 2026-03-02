/**
 * @fileOverview Transcribes a podcast audio file from Google Cloud Storage.
 *
 * - transcribePodcast - A function that handles the audio transcription process.
 * - PodcastTranscriptionInput - The input type for the function.
 * - PodcastTranscriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscriptSegmentSchema = z.object({
  text: z.string().describe('The transcribed text of a segment.'),
  startTime: z.string().describe('The start time of the segment in the audio in HH:MM:SS format.'),
  endTime: z.string().describe('The end time of the segment in the audio in HH:MM:SS format.'),
});

const PodcastTranscriptionInputSchema = z.object({
  gsUri: z.string().describe("The Google Cloud Storage URI of the audio file to be transcribed (e.g., gs://bucket-name/audio.mp3)."),
});
export type PodcastTranscriptionInput = z.infer<typeof PodcastTranscriptionInputSchema>;

const PodcastTranscriptionOutputSchema = z.array(TranscriptSegmentSchema);
export type PodcastTranscriptionOutput = z.infer<typeof PodcastTranscriptionOutputSchema>;


export async function transcribePodcast(input: PodcastTranscriptionInput): Promise<PodcastTranscriptionOutput> {
  return podcastTranscriptionFlow(input);
}

const transcriptionPrompt = ai.definePrompt(
  {
    name: 'podcastTranscriptionPrompt',
    input: { schema: PodcastTranscriptionInputSchema },
    output: { schema: PodcastTranscriptionOutputSchema },
    prompt: `You are an expert audio transcriptionist. Your task is to transcribe the provided audio file with high accuracy, segmenting it for highlight creation.

### Rules
- The output MUST be a valid, raw JSON array of transcript segments.
- Each object in the array MUST contain "text", "startTime", and "endTime" fields.
- Timestamps ("startTime", "endTime") MUST be in the strict HH:MM:SS format.
- **Segmenting is CRUCIAL:** Group sentences into logical, paragraph-like segments. Each segment should cover a complete thought, topic, or a few related sentences. Avoid very short, single-sentence segments. Aim for segments that are at least 15-30 seconds long to provide good material for creating highlights.

Audio for transcription: {{media url=gsUri}}`,
    model: 'googleai/gemini-1.5-pro',
    config: {
      temperature: 0.1,
    }
  },
);

const podcastTranscriptionFlow = ai.defineFlow(
  {
    name: 'podcastTranscriptionFlow',
    inputSchema: PodcastTranscriptionInputSchema,
    outputSchema: PodcastTranscriptionOutputSchema,
  },
  async (input) => {
    const { output } = await transcriptionPrompt(input);
    if (!output) {
        throw new Error("Transcription failed: The AI model did not return a valid response.");
    }
    return output;
  }
);
