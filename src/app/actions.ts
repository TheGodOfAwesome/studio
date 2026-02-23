"use server";

import {
  podcastHighlightIdentification,
  type PodcastHighlightIdentificationInput,
  type PodcastHighlightIdentificationOutput
} from "@/ai/flows/podcast-highlight-identification";
import { mockTranscript } from "@/lib/placeholder-data";
import { z } from "zod";

const interestsSchema = z.array(z.string());

export async function generateHighlightsAction(
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
    return { success: false, error: "An unexpected error occurred while generating highlights." };
  }
}
