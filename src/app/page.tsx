"use client";

import { useState } from "react";
import { type PodcastHighlightIdentificationOutput } from "@/ai/flows/podcast-highlight-identification";
import { Activity, Rss } from "lucide-react";
import GenerateHighlightsForm from "@/components/generate-highlights-form";
import HighlightsResult from "@/components/highlights-result";
import { Skeleton } from "@/components/ui/skeleton";

type ActionResult = {
  success: boolean;
  data?: PodcastHighlightIdentificationOutput;
  error?: string;
};

export default function Home() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (
    action: () => Promise<ActionResult>
  ): Promise<void> => {
    setLoading(true);
    setResult(null);
    const actionResult = await action();
    setResult(actionResult);
    setLoading(false);
  };

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
              {result?.success && result.data && (
                <HighlightsResult highlights={result.data} />
              )}
              {result?.error && (
                 <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center text-destructive">
                   <p className="font-medium">An error occurred:</p>
                   <p>{result.error}</p>
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
