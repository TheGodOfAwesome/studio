"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Loader2, Rss, Sparkles } from "lucide-react";

const formSchema = z.object({
  rssUrl: z.string().url({ message: "Please enter a valid RSS feed URL." }),
  interests: z.string().min(1, { message: "Please provide your interests." }).refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(item => typeof item === 'string');
    } catch (e) {
      return false;
    }
  }, { message: "Interests must be a valid JSON array of strings." }),
});

type FormData = z.infer<typeof formSchema>;

type GenerateHighlightsFormProps = {
  onSubmit: (data: FormData) => Promise<void>;
  loading: boolean;
};

export default function GenerateHighlightsForm({ onSubmit, loading }: GenerateHighlightsFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rssUrl: "https://feeds.simplecast.com/54nAGcIl",
      interests: '["AI in business", "venture capital", "startup growth"]',
    },
  });

  function onFormSubmit(values: FormData) {
    onSubmit(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-primary" />
            <span>Podcast Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rssUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><Rss className="h-4 w-4" />RSS Feed URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://feeds.simplecast.com/your-podcast" {...field} />
                  </FormControl>
                   <FormDescription>
                    We'll fetch the podcast title and latest episode audio from this feed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><List className="h-4 w-4" />Your Interests (JSON Array)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='["technology", "startups", "AI"]'
                      className="min-h-[100px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a JSON array of strings to filter the content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Highlights
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
