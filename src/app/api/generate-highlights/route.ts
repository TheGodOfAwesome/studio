import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  podcastHighlightIdentification,
  type PodcastHighlightIdentificationInput,
} from '@/ai/flows/podcast-highlight-identification';
import { transcribePodcast } from '@/ai/flows/podcast-transcription';
import { getPodcastInfoFromRss } from '@/app/actions';
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

const apiSchema = z.object({
  rssUrl: z.string().url({ message: "Invalid RSS URL." }),
  interests: z.array(z.string()).min(1, { message: "Interests array cannot be empty." }),
});

export async function POST(request: Request) {
  let storageRef;
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
    const { title, audioUrl } = podcastInfoResult.data;

    // 2. Download audio and upload to Firebase Storage
    const response = await fetch(audioUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const audioBuffer = await response.arrayBuffer();
    const fileExtension = audioUrl.split('.').pop()?.split('?')[0] || 'mp3';
    const fileName = `uploads/${uuidv4()}.${fileExtension}`;
    storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, audioBuffer, { contentType: response.headers.get('content-type') || 'audio/mpeg' });

    // 3. Create GS URI and transcribe audio
    const gsUri = `gs://${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${fileName}`;
    const transcript = await transcribePodcast({ gsUri });

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ success: false, error: "Audio transcription failed or returned an empty transcript." }, { status: 500 });
    }

    // 4. Prepare input for the highlight identification flow
    const aiInput: PodcastHighlightIdentificationInput = {
      podcastTitle: title,
      transcript: transcript,
      interests: interests,
    };

    // 5. Call the highlight identification flow
    const highlights = await podcastHighlightIdentification(aiInput);

    if (!highlights) {
       return NextResponse.json({ success: false, error: "The AI model did not return a valid response for highlight generation." }, { status: 500 });
    }

    // 6. Return the successful result
    return NextResponse.json({ success: true, data: highlights });

  } catch (error) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ success: false, error: "An internal server error occurred.", details: errorMessage }, { status: 500 });
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
