import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  podcastHighlightIdentification,
  type PodcastHighlightIdentificationInput,
} from '@/ai/flows/podcast-highlight-identification';
import { getPodcastInfoFromRss } from '@/app/actions';
import { mockTranscript } from '@/lib/placeholder-data';

const apiSchema = z.object({
  rssUrl: z.string().url({ message: "Invalid RSS URL." }),
  interests: z.array(z.string()).min(1, { message: "Interests array cannot be empty." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = apiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Invalid request body.", details: validation.error.flatten() }, { status: 400 });
    }

    const { rssUrl, interests } = validation.data;

    // 1. Get podcast info from RSS feed
    const podcastInfoResult = await getPodcastInfoFromRss(rssUrl);

    if (!podcastInfoResult.success || !podcastInfoResult.data) {
      return NextResponse.json({ success: false, error: podcastInfoResult.error ?? "Failed to get podcast info." }, { status: 400 });
    }

    const { title } = podcastInfoResult.data;

    // 2. Prepare input for the AI flow
    const aiInput: PodcastHighlightIdentificationInput = {
      podcastTitle: title,
      transcript: mockTranscript,
      interests: interests,
    };

    // 3. Call the AI flow
    const highlights = await podcastHighlightIdentification(aiInput);

    if (!highlights) {
       return NextResponse.json({ success: false, error: "The AI model did not return a valid response." }, { status: 500 });
    }

    // 4. Return the successful result
    return NextResponse.json({ success: true, data: highlights });

  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ success: false, error: "An internal server error occurred.", details: errorMessage }, { status: 500 });
  }
}
