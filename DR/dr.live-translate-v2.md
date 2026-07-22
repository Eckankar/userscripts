This userscript provides automated translation of subtitles on [DR.dk](https://dr.dk/drtv).

This script is a rewrite of the original [DR Live Translate](https://greasyfork.org/en/scripts/530020-dr-live-translate), changing it from doing line-by-line translation on the fly, to instead doing a larger translation pass on the whole video, before starting the video.

## Features

* Automatic translation of videos on DR.dk
* Memory of previously translated subtitles, with option to export as `.srt`-format subtitle file.
* Support for either locally hosted LLMs, or running against an API like OpenRouter or similar.
* Show either combined English+Danish or only English subtitles.

--

## Finding a provider

In order to use this script, you will need to configure an LLM provider in your settings.

If you're unsure where to go, [OpenRouter](https://openrouter.ai/) provides access to most currently available LLM models at market rates.

The same models I would recommend running locally are available for cheap on there - [Gemma 4 26B A4B](https://openrouter.ai/google/gemma-4-26b-a4b-it) (faster, in theory) or [Gemma 4 31B](https://openrouter.ai/google/gemma-4-31b-it) (better, in theory). For higher quality, you could venture into a Gemini Flash model, or explore how other models fare.

## Running locally

If you want to run your own translation model locally, my recommendation is to set up [LM Studio](https://lmstudio.ai/). You'll need to go into power user/developer mode. Then you can download the model you want into it (in the Discover tab - I recommend the Gemma 4 series of models - 26B A4B (faster) or 31B (better, but requires more hardware)), and enable the API (in the Developer tab). You'll need to enable CORS.

Once you have it up and running, copy the API address shown on the Developer tab. Remember to add `/v1` at the end.
