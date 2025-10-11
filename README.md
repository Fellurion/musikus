# 🎵 Musikus - Discord Music Bot

A self-hosted Discord music bot with high-quality audio support (FLAC, MP3, RAW) and playlist management.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-14.x-blue.svg)](https://discord.js.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🌐 English

### ✨ Features

- 🎧 **High-Quality Audio**: Support for FLAC (lossless), MP3 (320 kbps), and RAW audio
- 📁 **Playlist Management**: Create and manage multiple playlists per user
- 🔄 **Automatic Conversion**: Automatically converts uploaded audio files to different formats
- 📥 **HTTP Download**: Download audio from HTTP/HTTPS sources
- 📤 **File Upload**: Supports upload of FLAC, MP3, WAV, and OGG files
- ⏭️ **Advanced Controls**: Skip function with multiple songs
- 🔍 **Autocomplete**: Smart playlist suggestions during input
- 🎯 **User-Based**: Each user has their own playlists
- 🔒 **Permission System**: Only the creator or admins can control playlists

### 📋 Requirements

- [Node.js](https://nodejs.org/) (v18.x or higher)
- [FFmpeg](https://ffmpeg.org/) (must be located in project directory under `./ffmpeg/bin/`)
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- Server ID and Client ID of your Discord application

### 🚀 Installation

#### 1. Clone Repository

```bash
git clone https://github.com/Fellurion/musikus.git
cd musikus
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Setup FFmpeg

Download FFmpeg and place the files as follows:
```
musikus/
├── ffmpeg/
│   └── bin/
│       ├── ffmpeg.exe
│       └── ffprobe.exe
```

**Windows**: [FFmpeg Download](https://www.gyan.dev/ffmpeg/builds/)  
**Linux/Mac**: Install FFmpeg via your package manager and adjust paths in `main.js`

#### 4. Configure Environment Variables

Create a `.env` file in the project directory:

```env
DISCORD_TOKEN=your_bot_token
SERVER_ID=your_server_id
CLIENT_ID=your_client_id
```

**How to get the required IDs:**
- **DISCORD_TOKEN**: Discord Developer Portal → Your Application → Bot → Token
- **CLIENT_ID**: Discord Developer Portal → Your Application → Application ID
- **SERVER_ID**: Right-click on your server in Discord → Copy Server ID (Developer Mode must be enabled)

#### 5. Start Bot

```bash
node main.js
```

### 🎮 Commands

#### Create Playlist
```
/create playlist name:<playlist-name>
```
Creates a new personal playlist.

#### Add Song
```
/playlist add name:<playlist-name> url:<http-url>
/playlist add name:<playlist-name> file:<audio-file>
```
Adds a song to the playlist - either via HTTP/HTTPS URL or file upload.

**Supported Formats**: FLAC, MP3, WAV, OGG

#### Play Playlist
```
/playlist play name:<playlist-name>
```
Plays the selected playlist in the current voice channel.

#### Skip Songs
```
/playlist skip [amount:<number>]
```
Skips one or more songs (default: 1).

#### Show Playlist
```
/playlist list name:<playlist-name>
```
Displays all songs in the playlist.

#### Stop Playback
```
/stop
```
Stops current playback and disconnects the bot from the voice channel.

### 📁 Project Structure

```
musikus/
├── main.js              # Main file with bot logic
├── package.json         # Node.js dependencies
├── .env                 # Environment variables (not in repo)
├── ffmpeg/             # FFmpeg binaries
│   └── bin/
├── playlists/          # User playlists (created automatically)
│   └── <user-id>/
│       └── <playlist-name>/
│           ├── info.json
│           └── *.flac / *.mp3 / *.raw
└── streamplaylists/    # Stream playlists (future feature)
```

### 🔧 Technical Details

#### Audio Quality
- **FLAC**: Lossless compression (1411 kbps, 48 kHz, Stereo)
- **MP3**: High quality (320 kbps, 48 kHz, Stereo)
- **RAW**: Uncompressed PCM (s16le, 48 kHz, Stereo)

#### Automatic Conversion
The bot automatically converts uploaded files:
- FLAC → MP3 + RAW
- MP3 → FLAC + RAW
- Other formats → MP3 + FLAC + RAW

#### Playback Priority
1. FLAC (highest quality)
2. MP3 (fallback)
3. RAW (last option)

### 🐛 Troubleshooting

#### Bot doesn't start
- Check if all values in `.env` file are correct
- Make sure FFmpeg is installed correctly
- Verify Node.js version (`node --version`)

#### Songs won't play
- Check if audio files were converted correctly
- Look at console for error messages
- Make sure the bot has access to the voice channel

#### Download fails
- Some sources may be region-locked or unavailable
- Check your internet connection
- Make sure `play-dl` is installed correctly

### 📦 Dependencies

```json
{
  "discord.js": "^14.x",
  "@discordjs/voice": "^0.16.x",
  "play-dl": "^1.9.x",
  "fluent-ffmpeg": "^2.1.x",
  "fs-extra": "^11.x",
  "dotenv": "^16.x"
}
```

### 🤝 Contributing

Contributions are welcome! Please create a pull request or open an issue.

### 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

### 👤 Author

**Fellurion**
- GitHub: [@Fellurion](https://github.com/Fellurion)
- Repository: [musikus](https://github.com/Fellurion/musikus)

### ⭐ Support

If you like this project, give it a star on GitHub!

### ⚠️ Legal Disclaimer

**IMPORTANT**: This bot is intended for **private, self-hosted use only**.

- You are solely responsible for ensuring that any content you download complies with applicable copyright laws and terms of service
- Downloading copyrighted material without permission may be illegal in your jurisdiction
- The author(s) of this software assume **no liability** for any misuse or legal consequences resulting from the use of this bot
- By using this bot to download content from public sources, you accept **full responsibility** for your actions
- This bot is provided "as is" without any warranties

**Use at your own risk!**

---

## 🇩🇪 Deutsch

### ✨ Features

- 🎧 **High-Quality Audio**: Unterstützung für FLAC (verlustfrei), MP3 (320 kbps) und RAW-Audio
- 📁 **Playlist-Management**: Erstelle und verwalte mehrere Playlists pro Benutzer
- 🔄 **Automatische Konvertierung**: Konvertiert hochgeladene Audiodateien automatisch in verschiedene Formate
- 📥 **HTTP-Download**: Lade Audio von HTTP/HTTPS-Quellen herunter
- 📤 **Datei-Upload**: Unterstützt Upload von FLAC, MP3, WAV und OGG-Dateien
- ⏭️ **Erweiterte Steuerung**: Skip-Funktion mit mehreren Songs
- 🔍 **Autocomplete**: Intelligente Playlist-Vorschläge bei der Eingabe
- 🎯 **Benutzerbasiert**: Jeder Benutzer hat seine eigenen Playlists
- 🔒 **Berechtigungssystem**: Nur der Ersteller oder Admins können Playlists steuern

### 📋 Voraussetzungen

- [Node.js](https://nodejs.org/) (v18.x oder höher)
- [FFmpeg](https://ffmpeg.org/) (muss im Projektverzeichnis unter `./ffmpeg/bin/` liegen)
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- Server ID und Client ID deiner Discord-Anwendung

### 🚀 Installation

#### 1. Repository klonen

```bash
git clone https://github.com/Fellurion/musikus.git
cd musikus
```

#### 2. Dependencies installieren

```bash
npm install
```

#### 3. FFmpeg einrichten

Lade FFmpeg herunter und platziere die Dateien wie folgt:
```
musikus/
├── ffmpeg/
│   └── bin/
│       ├── ffmpeg.exe
│       └── ffprobe.exe
```

**Windows**: [FFmpeg Download](https://www.gyan.dev/ffmpeg/builds/)  
**Linux/Mac**: Installiere FFmpeg über deinen Paketmanager und passe die Pfade in `main.js` an

#### 4. Umgebungsvariablen konfigurieren

Erstelle eine `.env` Datei im Projektverzeichnis:

```env
DISCORD_TOKEN=dein_bot_token
SERVER_ID=deine_server_id
CLIENT_ID=deine_client_id
```

**So erhältst du die benötigten IDs:**
- **DISCORD_TOKEN**: Discord Developer Portal → Deine Application → Bot → Token
- **CLIENT_ID**: Discord Developer Portal → Deine Application → Application ID
- **SERVER_ID**: Rechtsklick auf deinen Server in Discord → Server-ID kopieren (Entwicklermodus muss aktiviert sein)

#### 5. Bot starten

```bash
node main.js
```

### 🎮 Befehle

#### Playlist erstellen
```
/create playlist name:<playlist-name>
```
Erstellt eine neue persönliche Playlist.

#### Song hinzufügen
```
/playlist add name:<playlist-name> url:<http-url>
/playlist add name:<playlist-name> file:<audio-datei>
```
Fügt einen Song zur Playlist hinzu - entweder per HTTP/HTTPS-URL oder Datei-Upload.

**Unterstützte Formate**: FLAC, MP3, WAV, OGG

#### Playlist abspielen
```
/playlist play name:<playlist-name>
```
Spielt die ausgewählte Playlist im aktuellen Voice-Channel ab.

#### Songs überspringen
```
/playlist skip [amount:<anzahl>]
```
Überspringt einen oder mehrere Songs (Standard: 1).

#### Playlist anzeigen
```
/playlist list name:<playlist-name>
```
Zeigt alle Songs in der Playlist an.

#### Wiedergabe stoppen
```
/stop
```
Stoppt die aktuelle Wiedergabe und trennt den Bot vom Voice-Channel.

### 📁 Projektstruktur

```
musikus/
├── main.js              # Hauptdatei mit Bot-Logik
├── package.json         # Node.js Dependencies
├── .env                 # Umgebungsvariablen (nicht im Repo)
├── ffmpeg/             # FFmpeg Binaries
│   └── bin/
├── playlists/          # Benutzer-Playlists (wird automatisch erstellt)
│   └── <user-id>/
│       └── <playlist-name>/
│           ├── info.json
│           └── *.flac / *.mp3 / *.raw
└── streamplaylists/    # Stream-Playlists (zukünftige Funktion)
```

### 🔧 Technische Details

#### Audio-Qualität
- **FLAC**: Verlustfreie Kompression (1411 kbps, 48 kHz, Stereo)
- **MP3**: Hohe Qualität (320 kbps, 48 kHz, Stereo)
- **RAW**: Unkomprimiertes PCM (s16le, 48 kHz, Stereo)

#### Automatische Konvertierung
Der Bot konvertiert automatisch hochgeladene Dateien:
- FLAC → MP3 + RAW
- MP3 → FLAC + RAW
- Andere Formate → MP3 + FLAC + RAW

#### Wiedergabe-Priorität
1. FLAC (höchste Qualität)
2. MP3 (Fallback)
3. RAW (letzte Option)

### 🐛 Troubleshooting

#### Bot startet nicht
- Prüfe, ob alle Werte in der `.env` Datei korrekt sind
- Stelle sicher, dass FFmpeg korrekt installiert ist
- Überprüfe die Node.js Version (`node --version`)

#### Songs werden nicht abgespielt
- Prüfe, ob die Audiodateien korrekt konvertiert wurden
- Schaue in die Konsole nach Fehlermeldungen
- Stelle sicher, dass der Bot Zugriff auf den Voice-Channel hat

#### Download schlägt fehl
- Manche Quellen sind möglicherweise regional gesperrt oder nicht verfügbar
- Prüfe deine Internetverbindung
- Stelle sicher, dass `play-dl` korrekt installiert ist

### 📦 Dependencies

```json
{
  "discord.js": "^14.x",
  "@discordjs/voice": "^0.16.x",
  "play-dl": "^1.9.x",
  "fluent-ffmpeg": "^2.1.x",
  "fs-extra": "^11.x",
  "dotenv": "^16.x"
}
```

### 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

### 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) Datei für Details.

### 👤 Autor

**Fellurion**
- GitHub: [@Fellurion](https://github.com/Fellurion)
- Repository: [musikus](https://github.com/Fellurion/musikus)

### ⭐ Support

Wenn dir dieses Projekt gefällt, gib ihm einen Stern auf GitHub!

### ⚠️ Rechtlicher Haftungsausschluss

**WICHTIG**: Dieser Bot ist nur für **private, selbstgehostete Nutzung** gedacht.

- Du bist allein dafür verantwortlich, dass alle heruntergeladenen Inhalte den geltenden Urheberrechtsgesetzen und Nutzungsbedingungen entsprechen
- Das Herunterladen urheberrechtlich geschützten Materials ohne Erlaubnis kann in deinem Land illegal sein
- Der/die Autor(en) dieser Software übernehmen **keine Haftung** für Missbrauch oder rechtliche Konsequenzen, die sich aus der Nutzung dieses Bots ergeben
- Durch die Verwendung dieses Bots zum Herunterladen von Inhalten aus öffentlichen Quellen übernimmst du die **volle Verantwortung** für deine Handlungen
- Dieser Bot wird "wie besehen" ohne jegliche Garantien zur Verfügung gestellt

**Nutzung auf eigene Gefahr!**
