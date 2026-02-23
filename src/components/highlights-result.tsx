"use client";

import { useState } from "react";
import { type PodcastHighlightIdentificationOutput } from "@/ai/flows/podcast-highlight-identification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, Copy, Quote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type HighlightsResultProps = {
  highlights: PodcastHighlightIdentificationOutput;
};

export default function HighlightsResult({ highlights }: HighlightsResultProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const jsonString = JSON.stringify(highlights, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      toast({
        title: "Copied to Clipboard!",
        description: "The JSON output has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!highlights || highlights.length === 0) {
    return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>No Highlights Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">The AI could not identify any relevant highlights based on your interests.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold font-headline">AI-Generated Highlights</h3>
        <Button variant="outline" onClick={copyToClipboard}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </div>

      <div className="grid gap-4">
        {highlights.map((highlight, index) => (
          <Card key={index} className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-start gap-3">
                <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="block text-accent font-semibold capitalize">{highlight.highlight_name.replace(/_/g, ' ')}</span>
                  <p className="text-xl font-normal text-foreground mt-1 flex gap-2">
                    <Quote className="h-5 w-5 flex-shrink-0 text-muted-foreground transform -scale-x-100" />
                    <span className="flex-1">"{highlight.hook_caption}"</span>
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardFooter className="bg-muted/50 px-6 py-3">
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  <span className="font-semibold">{highlight.start_time}</span> – <span className="font-semibold">{highlight.end_time}</span>
                </span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
