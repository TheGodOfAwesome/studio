"use server";

import { createClient } from "@deepgram/sdk";
import Parser from "rss-parser";
import { 
  podcastHighlightIdentification, 
  type PodcastHighlightIdentificationOutput 
} from "@/ai/flows/podcast-highlight-identification";

const DEEPGRAM_SECRET = process.env.DEEPGRAM_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const parser = new Parser();

type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
};

// Helper to format seconds into HH:MM:SS string
const formatTime = (seconds: number): string => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}

/**
 * Fetches and parses an RSS feed to get information about the latest podcast episode.
 */
export async function getPodcastInfoFromRss(
  rssUrl: string
): Promise<ActionResponse<{ audioUrl: string; title: string | undefined; description: string | undefined;}>> {
  try {
    const feed = await parser.parseURL(rssUrl);
    const latestEpisode = feed.items[0];

    if (!latestEpisode || !latestEpisode.enclosure?.url) {
      return {
        success: false,
        error: "No audio URL found in the latest episode of the RSS feed.",
      };
    }

    return {
      success: true,
      data: {
        audioUrl: latestEpisode.enclosure.url,
        title: latestEpisode.title,
        description:
          latestEpisode.itunes?.subtitle || latestEpisode.contentSnippet,
      },
    };
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
    return {
      success: false,
      error: "Failed to parse RSS feed. Please check the URL.",
    };
  }
}

/**
 * The main server action to generate podcast highlights.
 */
export async function generateHighlightsAction(
  rssUrl: string,
  interests: string[]
): Promise<ActionResponse<PodcastHighlightIdentificationOutput>> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
    console.error("GEMINI_API_KEY not set or is placeholder");
    return {
      success: false,
      error: "Server configuration error: Gemini API key is not set. Please add it to your .env file.",
    };
  }
  
  if (!DEEPGRAM_SECRET || DEEPGRAM_SECRET === "YOUR_API_KEY_HERE") {
    console.error("DEEPGRAM_SECRET not set or is placeholder");
    return {
      success: false,
      error: "Server configuration error: Deepgram API key is not set. Please add it to your .env file.",
    };
  }

  try {
    // 1. Get podcast metadata from the RSS feed.
    const feed = await parser.parseURL(rssUrl);
    const latestEpisode = feed.items[0];
    const podcastUrl = latestEpisode?.enclosure?.url;
    const podcastTitle = latestEpisode?.title;

    if (!podcastUrl || !podcastTitle) {
      return {
        success: false,
        error: "Could not find an audio URL or title in the RSS feed.",
      };
    }

    // 2. Transcribe the audio using Deepgram.
    const deepgram = createClient(DEEPGRAM_SECRET);
    const { result, error: deepgramError } =
      await deepgram.listen.prerecorded.transcribeUrl(
        { url: podcastUrl },
        {
          model: "nova-2",
          smart_format: true,
          utterances: true,
        }
      );

    if (deepgramError) {
      console.error("Deepgram transcription error:", deepgramError);
      return {
        success: false,
        error: `Audio transcription failed: ${deepgramError.message}`,
      };
    }
    
    if (!result?.results?.utterances) {
        return { success: false, error: "Transcription result is empty or did not contain utterances." };
    }

    // 3. Format the Deepgram utterances into the structure the AI flow expects.
    const transcriptForAI = result.results.utterances.map(utt => ({
        text: utt.transcript,
        startTime: formatTime(utt.start),
        endTime: formatTime(utt.end),
    }));

    // 4. Run the AI flow to identify highlights.
    const llmResponse = await podcastHighlightIdentification({
        podcastTitle: podcastTitle,
        transcript: transcriptForAI,
        interests: interests,
    });

    return { success: true, data: llmResponse };
  } catch (err: any) {
    console.error("Generate Highlights Action Error:", err);
    return {
      success: false,
      error: "An unexpected error occurred while generating highlights.",
      details: err.message,
    };
  }
}
