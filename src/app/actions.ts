"use server";

import {
  podcastHighlightIdentification,
  type PodcastHighlightIdentificationInput,
  type PodcastHighlightIdentificationOutput,
} from "@/ai/flows/podcast-highlight-identification";
import { transcribePodcast } from "@/ai/flows/podcast-transcription";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { z } from "zod";
import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';

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
  audioUrl: string,
  interestsJson: string
): Promise<{ success: boolean; data?: PodcastHighlightIdentificationOutput; error?: string }> {
  let storageRef;
  try {
    // 1. Parse and validate interests
    let interests: string[];
    try {
      const parsedInterests = JSON.parse(interestsJson);
      interests = interestsSchema.parse(parsedInterests);
    } catch (e) {
      console.error("Interest parsing error:", e);
      return { success: false, error: "Invalid JSON format for interests. Please provide an array of strings." };
    }

    // 2. Download audio and upload to Firebase Storage
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const audioBuffer = await response.arrayBuffer();
    const fileExtension = audioUrl.split('.').pop()?.split('?')[0] || 'mp3';
    const fileName = `uploads/${uuidv4()}.${fileExtension}`;
    storageRef = ref(storage, fileName);
    
    // Note: This uploads the entire file at once. For very large files, a streaming upload
    // might be necessary to avoid memory issues on the server.
    await uploadBytes(storageRef, audioBuffer, { contentType: response.headers.get('content-type') || 'audio/mpeg' });
    
    // 3. Create GS URI and transcribe audio
    const gsUri = `gs://${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${fileName}`;
    const transcript = await transcribePodcast({ gsUri });

    if (!transcript || transcript.length === 0) {
      return { success: false, error: "Audio transcription failed or returned an empty transcript." };
    }

    // 4. Prepare input for the highlight identification flow
    const aiInput: PodcastHighlightIdentificationInput = {
      podcastTitle,
      transcript: transcript,
      interests: interests,
    };

    // 5. Call the highlight identification flow
    const highlights = await podcastHighlightIdentification(aiInput);

    if (!highlights) {
       return { success: false, error: "The AI model did not return a valid response for highlight generation." };
    }
    
    // 6. Return the successful result
    return { success: true, data: highlights };
  } catch (error) {
    console.error("AI flow error:", error);
    return { success: false, error: "An unexpected error occurred while generating highlights." };
  } finally {
    // 7. Clean up the uploaded file from storage
    if (storageRef) {
      try {
        await deleteObject(storageRef);
      } catch (cleanupError) {
        console.error("Failed to cleanup audio file from storage:", cleanupError);
      }
    }
  }
}
