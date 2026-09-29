# Twitch chat in Browser Source

Simple Twitch chat via a Browser Source in OBS Studio that only uses local files.  
Using local files allows full customization of chat.

## Why use this?

When using chat integrations through URLs, you won't be able to fully customize chat.  
This can be an issue if, for example, you want to hide user inputs for channel point rewards or other things.

## Requirements

You'll need an Access Token associated with your channel (or the channel the chat is for).

## How to setup

- Download files via <> Code => Local => Download ZIP and extract anywhere.
- Rename the "TwitchConfig.example.js" file to "TwitchConfig.js"
- Open the file in a text editor (Notepad, VS Code, ...) and changes values based on your preferences
- Create a new Browser Source in OBS Studio:
  - Check "Local file"
  - Select the "index.html" file
  - Set width (recommended 450)
  - Set height (recommended at least 400)
  - Check "Shutdown source when not visible" (not necessary but good for saving resources)

## Customizing chat appearance

1. Create a new .html file in the "tpl" subfolder
2. Create a new .css file in the "css" subfolder with the same name
3. In "TwitchConfig.js", set the name for "this.template"
4. Customize your .html & .css files to your liking and add variables to .html:
   - {{BADGES}} to show a user's badges
   - {{USERNAME}} for username
   - {{MESSAGE}} for their message

_Note: None of these variables are required, for example if you don't want to see badges or usernames, you can just add {{MESSAGE}}._

## Why are custom badges not showing?

To simplify implementation, only global badges are shown. Custom badges (custom subscriber icons, etc) would require more Twitch API credentials.

I want this to stay simple and easy to setup.
