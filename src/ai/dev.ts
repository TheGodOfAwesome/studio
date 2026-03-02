import { config } from 'dotenv';
config();

import '@/ai/flows/podcast-transcription.ts';
import '@/ai/flows/podcast-highlight-identification.ts';
import '@/ai/flows/podcast-transcript-filtering-and-summarization.ts';
