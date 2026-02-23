"use server";

import {
  podcastHighlightIdentification,
  type PodcastHighlightIdentificationInput,
  type PodcastHighlightIdentificationOutput
} from "@/ai/flows/podcast-highlight-identification";
import { mockTranscript } from "@/lib/placeholder-data";
import { z } from "zod";
import Parser from 'rss-parser';

const interestsSchema = z.array(z.string());
const rssUrlSchema = z.string().url();

const parser = new Parser();

export async function getPodcastInfoFromRss(
  rssUrl: string
): Promise<{ success: boolean; data?: { title: string; audioUrl: string }; error?: string }> {
  try {
    rssUrlSchema.parse(rssUrl);

    const feed = await parser.parseURL(rssUrl);

    const title = feed.title;
    if (!title) {
      return { success: false, error: "Could not find a title in the RSS feed." };
    }

    const latestItem = feed.items[0];
    const audioUrl = latestItem?.enclosure?.url;

    if (!audioUrl || !latestItem.enclosure?.type?.startsWith('audio')) {
      return { success: false, error: "Could not find a valid audio file in the latest episode of the RSS feed." };
    }

    return {
      success: true,
      data: {
        title: title,
        audioUrl: audioUrl,
      },
    };
  } catch (error) {
    console.error("RSS parsing error:", error);
    if (error instanceof z.ZodError) {
        return { success: false, error: "Invalid RSS feed URL." };
    }
    return { success: false, error: "Failed to parse the RSS feed. Please check the URL and ensure it's a valid podcast feed." };
  }
}


export async function generateHighlightsAction(
  podcastTitle: string,
  interestsJson: string
): Promise<{ success: boolean; data?: PodcastHighlightIdentificationOutput; error?: string }> {
  try {
    // Add a small delay to simulate network latency and show loading state
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 1. Parse and validate interests
    let interests: string[];
    try {
      const parsedInterests = JSON.parse(interestsJson);
      interests = interestsSchema.parse(parsedInterests);
    } catch (e) {
      console.error("Interest parsing error:", e);
      return { success: false, error: "Invalid JSON format for interests. Please provide an array of strings." };
    }

    // 2. Prepare input for the AI flow
    // In a real app, this would involve fetching RSS, downloading audio, and transcribing.
    // Here, we use a mock transcript.
    const aiInput: PodcastHighlightIdentificationInput = {
      podcastTitle,
      transcript: mockTranscript,
      interests: interests,
    };

    // 3. Call the AI flow
    const highlights = await podcastHighlightIdentification(aiInput);

    if (!highlights) {
       return { success: false, error: "The AI model did not return a valid response." };
    }

    // 4. Return the successful result
    return { success: true, data: highlights };
  } catch (error) {
    console.error("AI flow error:", error);
    // It's good practice to not expose raw error messages to the client.
    // return { success: false, error: "An unexpected error occurred while generating highlights." };
    return { success: false, error: JSON.stringify(error) as string };
    // return { success: false, error: error };
  }
}
