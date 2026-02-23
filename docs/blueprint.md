# **App Name**: Podcast Pulse

## Core Features:

- RSS Feed  and Interest JSON Ingestion: Accept a podcast RSS feed URL  and interests as JSON array as input.
- Audio Download & Processing: Download MP3/WAV audio files from the latest podcast episodes and convert them to text using transcription service.
- Interest-Based Analysis: Utilize a LLM as a tool to filter audio transcripts based on the list of user-provided interests and generate summaries.
- Highlight Identification: Employ generative AI to identify the top 5 most engaging segments based on user interests, noting the start and end times of these segments.
- JSON Output: Return a JSON array containing start_time, end_time, highlight name e.g. highlight_1 and a 10-word hook_caption for each engaging segment.

## Style Guidelines:

- Primary color: Deep indigo (#3F51B5) to convey intellect, insight, and focused listening.
- Background color: Very light grey (#F0F2F5), nearly white, for a clean, distraction-free listening experience.
- Accent color: Vivid purple (#9C27B0) for highlighting interactive elements and key information.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern, machined look. Suitable for headlines and body text.
- Use simple, minimalist icons to represent different interest categories and controls.
- Clean and efficient layout that allows the user to easily configure interest filters.
- Subtle animations to indicate loading and processing states.