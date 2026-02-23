"use client";

import { useState } from "react";
import { type PodcastHighlightIdentificationOutput } from "@/ai/flows/podcast-highlight-identification";
import { generateHighlightsAction, getPodcastInfoFromRss } from "@/app/actions";
import { Activity, Rss } from "lucide-react";
import GenerateHighlightsForm from "@/components/generate-highlights-form";
import HighlightsResult from "@/components/highlights-result";
import { Skeleton } from "@/components/ui/skeleton";

type HighlightsActionResult = {
  success: boolean;
  data?: PodcastHighlightIdentificationOutput;
  error?: string;
};

export default function Home() {
  const [result, setResult] = useState<HighlightsActionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (
    data: { rssUrl: string; interests: string }
  ): Promise<void> => {
    setLoading(true);
    setResult(null);
    setAudioUrl(null);
    setError(null);

    // 1. Get podcast info from RSS feed
    const podcastInfoResult = await getPodcastInfoFromRss(data.rssUrl);

    if (!podcastInfoResult.success || !podcastInfoResult.data) {
      setError(podcastInfoResult.error ?? "Failed to get podcast info.");
      setLoading(false);
      return;
    }

    const { title, audioUrl } = podcastInfoResult.data;
    setAudioUrl(audioUrl);
    
    // 2. Generate highlights
    const actionResult = await generateHighlightsAction(title, data.interests);
    setResult(actionResult);
    
    if(!actionResult.success) {
      setError(actionResult.error ?? "An unknown error occurred while generating highlights.");
    }

    setLoading(false);
  };

  const currentError = error || result?.error;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Rss className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold font-headline tracking-tight">
              Podcast Pulse
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <Activity className="mx-auto h-12 w-12 text-accent" />
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl font-headline">
                Discover Your Next Favorite Clip
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Provide a podcast RSS feed and your interests. Our AI will analyze the latest episodes and identify the most engaging highlights for you.
              </p>
            </div>
            
            <GenerateHighlightsForm
              onSubmit={handleFormSubmit}
              loading={loading}
            />

            <div className="mt-8">
              {loading && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold font-headline text-center">Generating Highlights...</h3>
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              )}
              {result?.success && result.data && audioUrl && (
                <HighlightsResult highlights={result.data} audioUrl={audioUrl} />
              )}
              {currentError && (
                 <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center text-destructive">
                   <p className="font-medium">An error occurred:</p>
                   <p>{currentError}</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground md:px-6">
          <p>Powered by Generative AI. Built with Next.js and ShadCN.</p>
        </div>
      </footer>
    </div>
  );
}
