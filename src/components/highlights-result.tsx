"use client";

import { useState, useRef, useEffect } from "react";
import { type PodcastHighlightIdentificationOutput } from "@/ai/flows/podcast-highlight-identification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, Copy, Quote, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type HighlightsResultProps = {
  highlights: PodcastHighlightIdentificationOutput;
  audioUrl: string;
};

export default function HighlightsResult({ highlights, audioUrl }: HighlightsResultProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeHighlight, setActiveHighlight] = useState<{ index: number; isPlaying: boolean } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const timeToSeconds = (time: string): number => {
    const parts = time.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  };

  const handlePlay = (index: number) => {
    if (!audioRef.current) return;

    const highlight = highlights[index];
    const startTime = timeToSeconds(highlight.start_time);

    if (activeHighlight?.index === index && activeHighlight.isPlaying) {
      audioRef.current.pause();
      setActiveHighlight({ index, isPlaying: false });
      return;
    }
    
    if (activeHighlight?.isPlaying && audioRef.current) {
        audioRef.current.pause();
    }

    audioRef.current.currentTime = startTime;
    audioRef.current.play().catch(e => console.error("Playback failed", e));
    setActiveHighlight({ index, isPlaying: true });
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || !activeHighlight || !activeHighlight.isPlaying) return;

    const highlight = highlights[activeHighlight.index];
    const startTime = timeToSeconds(highlight.start_time);
    const endTime = timeToSeconds(highlight.end_time);

    setCurrentTime(audioRef.current.currentTime);

    if (audioRef.current.currentTime >= endTime) {
      audioRef.current.pause();
      setActiveHighlight({ index: activeHighlight.index, isPlaying: false });
    }
  };
  
  const handleAudioEnded = () => {
    if(activeHighlight) {
        setActiveHighlight({ ...activeHighlight, isPlaying: false });
    }
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLProgressElement, MouseEvent>, index: number) => {
    if (!audioRef.current) return;

    const highlight = highlights[index];
    const startTime = timeToSeconds(highlight.start_time);
    const endTime = timeToSeconds(highlight.end_time);
    const duration = endTime - startTime;

    const progressBar = e.currentTarget;
    const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
    const clickRatio = clickPosition / progressBar.offsetWidth;
    const seekTime = startTime + (clickRatio * duration);

    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);

    if (!activeHighlight || !activeHighlight.isPlaying || activeHighlight.index !== index) {
        setActiveHighlight({ index, isPlaying: true });
        audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
  };

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
       <audio 
        ref={audioRef} 
        src={audioUrl} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleAudioEnded}
        className="hidden" 
        preload="auto"
      />
       <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold font-headline">AI-Generated Highlights</h3>
        <Button variant="outline" onClick={copyToClipboard}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </div>

      <div className="grid gap-4">
        {highlights.map((highlight, index) => {
            const startTime = timeToSeconds(highlight.start_time);
            const endTime = timeToSeconds(highlight.end_time);
            const duration = endTime - startTime;
            const progress = activeHighlight?.index === index && activeHighlight.isPlaying 
              ? ((currentTime - startTime) / duration) * 100 
              : 0;

            return (
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
                <CardFooter className="bg-muted/50 px-6 py-3 flex flex-col gap-3">
                  <div className="w-full flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          <span className="font-semibold">{highlight.start_time}</span> – <span className="font-semibold">{highlight.end_time}</span>
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handlePlay(index)} aria-label={`Play highlight ${index + 1}`}>
                        {activeHighlight?.index === index && activeHighlight.isPlaying ? (
                            <Pause className="h-5 w-5" />
                        ) : (
                            <Play className="h-5 w-5" />
                        )}
                    </Button>
                  </div>
                  <Progress 
                    value={progress} 
                    className="w-full h-2 cursor-pointer" 
                    onClick={(e) => handleSeek(e, index)}
                  />
                </CardFooter>
              </Card>
            )
        })}
      </div>
    </div>
  );
}
