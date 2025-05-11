require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const ffmpeg = require('fluent-ffmpeg');

// Setze den Pfad zu FFmpeg
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');
const ffprobePath = path.join(__dirname, 'ffmpeg', 'bin', 'ffprobe.exe');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log(`FFmpeg-Pfad: ${ffmpegPath}`);
console.log(`FFprobe-Pfad: ${ffprobePath}`);

// Globale Fehlerbehandlung
process.on('uncaughtException', (err) => {
  console.error('Unbehandelter Fehler:', err);
  console.error(err.stack);
  // Beende den Prozess mit Fehlercode, damit der Launcher ihn neu starten kann
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unbehandelte Promise-Ablehnung:', reason);
  // Beende den Prozess mit Fehlercode, damit der Launcher ihn neu starten kann
  process.exit(1);
});

// Client-Instanz erstellen
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// Playlist-Verzeichnis erstellen, falls es nicht existiert
const playlistsDir = './playlists';
fs.ensureDirSync(playlistsDir);

// Befehls-Collection
client.commands = new Collection();

// Befehle definieren
const commands = [
  {
    name: 'create',
    description: 'Erstelle eine neue Playlist',
    options: [
      {
        name: 'playlist',
        description: 'Erstelle eine neue Playlist',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der Playlist',
            type: 3,
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'playlist',
    description: 'Playlist-Verwaltung und Wiedergabe',
    options: [
      {
        name: 'play',
        description: 'Spiele eine Playlist ab',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der abzuspielenden Playlist',
            type: 3,
            required: true,
            autocomplete: true
          }
        ]
      },
      {
        name: 'add',
        description: 'Füge einen Song zu einer Playlist hinzu',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der Playlist',
            type: 3,
            required: true,
            autocomplete: true
          },
          {
            name: 'url',
            description: 'YouTube-URL des Songs oder leer lassen für Datei-Upload',
            type: 3,
            required: false
          },
          {
            name: 'file',
            description: 'Audiodatei (FLAC, MP3, etc.)',
            type: 11, // ATTACHMENT type
            required: false
          }
        ]
      },
      {
        name: 'skip',
        description: 'Überspringe den aktuellen Song',
        type: 1,
        options: [
          {
            name: 'amount',
            description: 'Anzahl der zu überspringenden Songs (Standard: 1)',
            type: 4, // INTEGER
            required: false
          }
        ]
      },
      {
        name: 'list',
        description: 'Zeige den Inhalt einer Playlist an',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der Playlist',
            type: 3,
            required: true,
            autocomplete: true
          }
        ]
      }
    ]
  },
  {
    name: 'stop',
    description: 'Stoppe die aktuelle Wiedergabe'
  },
  // Füge den neuen streamplaylist-Befehl hinzu
  {
    name: 'streamplaylist',
    description: 'Erstelle und verwalte YouTube-Stream-Playlists',
    options: [
      {
        name: 'create',
        description: 'Erstelle eine neue Stream-Playlist',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der Stream-Playlist',
            type: 3,
            required: true
          }
        ]
      },
      {
        name: 'add',
        description: 'Füge ein YouTube-Video zur Stream-Playlist hinzu',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der Stream-Playlist',
            type: 3,
            required: true,
            autocomplete: true
          },
          {
            name: 'url',
            description: 'YouTube-URL des Videos oder einer Playlist',
            type: 3,
            required: true
          }
        ]
      },
      {
        name: 'play',
        description: 'Spiele eine Stream-Playlist ab',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der abzuspielenden Stream-Playlist',
            type: 3,
            required: true,
            autocomplete: true
          }
        ]
      },
      {
        name: 'list',
        description: 'Zeige den Inhalt einer Stream-Playlist an',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Name der Stream-Playlist',
            type: 3,
            required: true,
            autocomplete: true
          }
        ]
      }
    ]
  }
];

// Stream-Playlist-Verzeichnis erstellen
const streamPlaylistsDir = './streamplaylists';
fs.ensureDirSync(streamPlaylistsDir);

// Befehle bei Discord registrieren
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Füge diese Funktion nach den Imports hinzu
async function scanAndInitializeManualUploads() {
  console.log('Scanne nach manuell hochgeladenen Musikdateien...');

  try {
    // Prüfe, ob das Playlist-Verzeichnis existiert
    if (!fs.existsSync(playlistsDir)) {
      console.log('Playlist-Verzeichnis existiert nicht. Erstelle es...');
      fs.ensureDirSync(playlistsDir);
      return;
    }

    // Durchlaufe alle Benutzerverzeichnisse
    const userDirs = fs.readdirSync(playlistsDir);
    for (const userId of userDirs) {
      const userPath = path.join(playlistsDir, userId);
      if (!fs.statSync(userPath).isDirectory()) continue;

      // Durchlaufe alle Playlists des Benutzers
      const playlists = fs.readdirSync(userPath);
      for (const playlistName of playlists) {
        const playlistPath = path.join(userPath, playlistName);
        if (!fs.statSync(playlistPath).isDirectory()) continue;

        // Lade die Playlist-Info oder erstelle sie, falls sie nicht existiert
        const infoPath = path.join(playlistPath, 'info.json');
        let playlistInfo;

        if (fs.existsSync(infoPath)) {
          playlistInfo = fs.readJsonSync(infoPath);
        } else {
          playlistInfo = {
            name: playlistName,
            createdAt: new Date().toISOString(),
            songs: []
          };
        }

        // Sammle alle Musikdateien in der Playlist
        const files = fs.readdirSync(playlistPath);
        const musicFiles = files.filter(file =>
          file.endsWith('.flac') ||
          file.endsWith('.mp3') ||
          file.endsWith('.wav') ||
          file.endsWith('.ogg')
        );

        // Gruppiere Dateien nach Basisnamen (ohne Erweiterung)
        const songGroups = {};

        for (const file of musicFiles) {
          const baseName = path.basename(file, path.extname(file));
          if (!songGroups[baseName]) {
            songGroups[baseName] = [];
          }
          songGroups[baseName].push(file);
        }

        // Verarbeite jede Songgruppe
        for (const [baseName, files] of Object.entries(songGroups)) {
          // Prüfe, ob der Song bereits in der Playlist ist
          const existingSong = playlistInfo.songs.find(song =>
            song.title === baseName ||
            (song.mp3Path && song.mp3Path.includes(baseName)) ||
            (song.flacPath && song.flacPath.includes(baseName))
          );

          if (existingSong) {
            console.log(`Song "${baseName}" bereits in Playlist "${playlistName}" vorhanden.`);
            continue;
          }

          console.log(`Initialisiere neuen Song "${baseName}" in Playlist "${playlistName}"...`);

          // Finde die verschiedenen Formate
          const flacFile = files.find(f => f.endsWith('.flac'));
          const mp3File = files.find(f => f.endsWith('.mp3'));
          const rawFile = files.find(f => f.endsWith('.raw'));

          // Definiere basePath hier, vor der Verwendung
          const basePath = path.join(playlistPath, baseName);

          // Wenn FLAC vorhanden ist, aber MP3 oder RAW fehlen, erstelle sie
          if (flacFile) {
            const flacPath = path.join(playlistPath, flacFile);

            // Erstelle MP3, wenn es nicht existiert
            if (!mp3File) {
              try {
                console.log(`Konvertiere "${baseName}" von FLAC zu MP3...`);
                await new Promise((resolve, reject) => {
                  ffmpeg(flacPath)
                    .audioBitrate(320)
                    .audioFrequency(48000)
                    .audioChannels(2)
                    .format('mp3')
                    .on('error', (err) => {
                      console.error(`Fehler bei MP3-Konvertierung für "${baseName}":`, err);
                      resolve(); // Trotz Fehler fortfahren
                    })
                    .on('end', () => {
                      console.log(`MP3-Konvertierung für "${baseName}" abgeschlossen`);
                      resolve();
                    })
                    .save(`${basePath}.mp3`);
                });
              } catch (error) {
                console.error(`Fehler bei MP3-Konvertierung für "${baseName}":`, error);
              }
            }

            // Erstelle RAW, wenn es nicht existiert
            if (!rawFile) {
              try {
                console.log(`Konvertiere "${baseName}" von FLAC zu RAW...`);
                await new Promise((resolve, reject) => {
                  ffmpeg(flacPath)
                    .format('s16le')
                    .audioFrequency(48000)
                    .audioChannels(2)
                    .on('error', (err) => {
                      console.error(`Fehler bei RAW-Konvertierung für "${baseName}":`, err);
                      resolve(); // Trotz Fehler fortfahren
                    })
                    .on('end', () => {
                      console.log(`RAW-Konvertierung für "${baseName}" abgeschlossen`);
                      resolve();
                    })
                    .save(`${basePath}.raw`);
                });
              } catch (error) {
                console.error(`Fehler bei RAW-Konvertierung für "${baseName}":`, error);
              }
            }
          }

          // Füge den Song zur Playlist hinzu
          const newSong = {
            title: baseName,
            url: '', // Keine URL für manuell hochgeladene Songs
            mp3Path: mp3File ? path.join(playlistPath, mp3File).replace(/\\/g, '/') : null,
            flacPath: flacFile ? path.join(playlistPath, flacFile).replace(/\\/g, '/') : null,
            rawPath: rawFile ? path.join(playlistPath, rawFile).replace(/\\/g, '/') : null,
            addedAt: new Date().toISOString(),
            manuallyAdded: true
          };

          // Aktualisiere die Pfade, falls neue Dateien erstellt wurden
          if (flacFile && !mp3File) {
            newSong.mp3Path = `${basePath}.mp3`.replace(/\\/g, '/');
          }
          if (flacFile && !rawFile) {
            newSong.rawPath = `${basePath}.raw`.replace(/\\/g, '/');
          }

          playlistInfo.songs.push(newSong);
          console.log(`Song "${baseName}" zur Playlist "${playlistName}" hinzugefügt.`);
        }

        // Speichere die aktualisierte Playlist-Info
        fs.writeJsonSync(infoPath, playlistInfo);
      }
    }

    console.log('Scan nach manuell hochgeladenen Musikdateien abgeschlossen.');
  } catch (error) {
    console.error('Fehler beim Scannen nach manuell hochgeladenen Musikdateien:', error);
  }
}

// Funktion zum Korrigieren der Pfade in bestehenden Playlists
async function fixPlaylistPaths() {
  console.log('Korrigiere Pfade in bestehenden Playlists...');

  try {
    // Prüfe, ob das Playlist-Verzeichnis existiert
    if (!fs.existsSync(playlistsDir)) {
      console.log('Playlist-Verzeichnis existiert nicht.');
      return;
    }

    // Durchlaufe alle Benutzerverzeichnisse
    const userDirs = fs.readdirSync(playlistsDir);
    for (const userId of userDirs) {
      const userPath = path.join(playlistsDir, userId);
      if (!fs.statSync(userPath).isDirectory()) continue;

      // Durchlaufe alle Playlists des Benutzers
      const playlists = fs.readdirSync(userPath);
      for (const playlistName of playlists) {
        const playlistPath = path.join(userPath, playlistName);
        if (!fs.statSync(playlistPath).isDirectory()) continue;

        // Lade die Playlist-Info
        const infoPath = path.join(playlistPath, 'info.json');
        if (!fs.existsSync(infoPath)) continue;

        let playlistInfo = fs.readJsonSync(infoPath);
        let changed = false;

        // Korrigiere die Pfade in jedem Song
        if (playlistInfo.songs && Array.isArray(playlistInfo.songs)) {
          for (const song of playlistInfo.songs) {
            if (song.mp3Path) {
              const oldPath = song.mp3Path;
              song.mp3Path = song.mp3Path.replace(/\\/g, '/');
              if (oldPath !== song.mp3Path) changed = true;
            }
            if (song.flacPath) {
              const oldPath = song.flacPath;
              song.flacPath = song.flacPath.replace(/\\/g, '/');
              if (oldPath !== song.flacPath) changed = true;
            }
            if (song.rawPath) {
              const oldPath = song.rawPath;
              song.rawPath = song.rawPath.replace(/\\/g, '/');
              if (oldPath !== song.rawPath) changed = true;
            }
          }
        }

        // Speichere die aktualisierte Playlist-Info, wenn Änderungen vorgenommen wurden
        if (changed) {
          console.log(`Korrigiere Pfade in Playlist "${playlistName}" für Benutzer ${userId}`);
          fs.writeJsonSync(infoPath, playlistInfo);
        }
      }
    }

    console.log('Pfadkorrektur abgeschlossen.');
  } catch (error) {
    console.error('Fehler beim Korrigieren der Pfade:', error);
  }
}

// Rufe diese Funktion beim Bot-Start auf, vor dem Scannen nach neuen Dateien
client.once('ready', async () => {
  console.log(`Angemeldet als ${client.user.tag}!`);

  try {
    console.log('Beginne mit der Aktualisierung der Anwendungsbefehle (/).');

    // Für serverspezifische Befehle (werden sofort aktualisiert):
    if (process.env.SERVER_ID && process.env.CLIENT_ID) {
      await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.SERVER_ID),
          { body: commands },
      );
      console.log(`Befehle erfolgreich für Server-ID registriert: ${process.env.SERVER_ID}`);
    } else {
      console.warn('SERVER_ID oder CLIENT_ID nicht in der .env-Datei gefunden. Befehle werden nicht registriert.');
    }

    console.log('Anwendungsbefehle (/) erfolgreich aktualisiert.');

    // Korrigiere Pfade in bestehenden Playlists
    await fixPlaylistPaths();

    // Scanne nach manuell hochgeladenen Musikdateien
    await scanAndInitializeManualUploads();
  } catch (error) {
    console.error(error);
  }
});

// Audio-Player
const players = new Map();

// Funktion zum Herunterladen eines Songs mit maximaler Qualität
async function downloadSong(url, outputPath, interaction) {
  return new Promise(async (resolve, reject) => {
    try {
      // Definiere Pfade
      const mp3Path = `${outputPath}.mp3`;
      const flacPath = `${outputPath}.flac`;
      const rawPath = `${outputPath}.raw`;
      const tempPath = `${outputPath}.temp`;
      let downloadedBytes = 0;
      console.log(`Starte Download für URL: ${url}`);
      await interaction.editReply(`Starte Download...`);

      // Hole Informationen über das Video mit play-dl
      try {
        const songInfo = await play.video_info(url);
        const songTitle = songInfo.video_details.title;

        console.log(`Video-Titel: ${songTitle}`);
        await interaction.editReply(`Lade "${songTitle}" herunter...`);

        // Download mit play-dl
        const stream = await play.stream_from_info(songInfo, { quality: 0 }); // Höchste Qualität
        const fileStream = fs.createWriteStream(tempPath);

        // Manuelles Tracking des Downloads
        let downloadedBytes = 0;
        let lastProgressUpdate = 0;

        stream.stream.on('data', (chunk) => {
          downloadedBytes += chunk.length;

          // Aktualisiere die Fortschrittsanzeige alle 2 Sekunden
          const now = Date.now();
          if (now - lastProgressUpdate > 2000) {
            lastProgressUpdate = now;

            // Erstelle Fortschrittsbalken basierend auf heruntergeladenen MB
            const mbDownloaded = downloadedBytes / (1024 * 1024);
            const progressBar = createProgressBar(Math.min(100, Math.floor(mbDownloaded * 10))); // 10 MB = 100%

            console.log(`Download: ${mbDownloaded.toFixed(2)} MB ${progressBar}`);

            // Aktualisiere Nachricht
            interaction.editReply(
              `Download läuft: ${mbDownloaded.toFixed(2)} MB ${progressBar}`
            ).catch(err => console.error('Fehler beim Aktualisieren der Fortschrittsanzeige:', err));
          }
        });

        // Pipe den Stream in die Datei
        stream.stream.pipe(fileStream);

        // Warte auf Abschluss des Downloads
        await new Promise((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
          stream.stream.on('error', reject);
        });

        console.log('Download abgeschlossen');
        await interaction.editReply(`Download abgeschlossen. Konvertiere zu MP3...`);

        // Prüfe, ob die temporäre Datei existiert und eine Größe > 0 hat
        if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
          throw new Error('Heruntergeladene Datei ist leer oder existiert nicht');
        }

        // Konvertiere zu MP3
        await new Promise((resolve, reject) => {
          ffmpeg(tempPath)
            .audioBitrate(320)
          ffmpeg(tempPath)
            .audioBitrate(320)
            .format('mp3')
            .on('error', (err) => {
              console.error('FFmpeg MP3-Fehler:', err);
              reject(err);
            })
            .on('end', () => {
              console.log('MP3-Konvertierung abgeschlossen');
              resolve();
            })
            .save(mp3Path);
        });

        await interaction.editReply(`MP3-Konvertierung abgeschlossen. Erstelle FLAC-Version...`);
        await interaction.editReply(`FLAC-Konvertierung abgeschlossen. Erstelle RAW-Version...`);
        // Konvertiere zu FLAC
        try {
          await new Promise((resolve, reject) => {
            ffmpeg(tempPath)
              .audioBitrate(1411)
              .audioFrequency(48000)
              .audioChannels(2)
              .format('flac')
              .on('error', (err) => {
                console.error('FFmpeg FLAC-Fehler:', err);
                resolve(); // Trotz Fehler fortfahren
              })
              .on('end', () => {
                console.log('FLAC-Konvertierung abgeschlossen');
                resolve();
              })
              .save(flacPath);
          });
        } catch (error) {
          console.error('Fehler bei FLAC-Konvertierung:', error);
          // Fahre trotzdem fort
        }

        await interaction.editReply(`FLAC-Konvertierung abgeschlossen. Erstelle RAW-Version...`);

        // Konvertiere zu RAW
        if (fs.existsSync(flacPath)) {
          try {
            await new Promise((resolve, reject) => {
              ffmpeg(flacPath)
                .format('s16le')
                .audioFrequency(48000)
                .audioChannels(2)
                .on('error', (err) => {
                  console.error('FFmpeg RAW-Fehler:', err);
                  resolve(); // Trotz Fehler fortfahren
                })
                .on('end', () => {
                  console.log('RAW-Konvertierung abgeschlossen');
                  resolve();
                })
                .save(rawPath);
            });
          } catch (error) {
            console.error('Fehler bei RAW-Konvertierung:', error);
            // Fahre trotzdem fort
          }
        }

        // Lösche temporäre Datei
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }

        await interaction.editReply(`Alle Konvertierungen abgeschlossen! "${songTitle}" ist bereit zur Wiedergabe in höchster Qualität.`);

        resolve({
          mp3Path: fs.existsSync(mp3Path) ? mp3Path : null,
          flacPath: fs.existsSync(flacPath) ? flacPath : null,
          rawPath: fs.existsSync(rawPath) ? rawPath : null
        });

      } catch (error) {
        console.error('Fehler beim Herunterladen oder Konvertieren:', error);
        await interaction.editReply(`Fehler beim Herunterladen oder Konvertieren: ${error.message}`);
        reject(error);
      }

    } catch (error) {
      console.error('Allgemeiner Fehler in downloadSong:', error);
      await interaction.editReply(`Fehler beim Herunterladen oder Konvertieren: ${error.message}`);
      reject(error);
    }
  });
}

// Hilfsfunktion zum Erstellen einer Fortschrittsleiste
function createProgressBar(percent) {
  const filledLength = Math.round(percent / 10);
  const emptyLength = 10 - filledLength;

  const filled = '■'.repeat(filledLength);
  const empty = '□'.repeat(emptyLength);

  return `[${filled}${empty}]`;
}

// Befehle verarbeiten
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

  // Autocomplete verarbeiten
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'playlist') {
      const userId = interaction.user.id;
      const userPlaylistsDir = `${playlistsDir}/${userId}`;

      if (fs.existsSync(userPlaylistsDir)) {
        const playlists = fs.readdirSync(userPlaylistsDir);
        const focusedValue = interaction.options.getFocused();
        const filtered = playlists.filter(name => name.startsWith(focusedValue));
        await interaction.respond(
            filtered.map(name => ({ name, value: name }))
        );
      } else {
        await interaction.respond([]);
      }
    }
    return;
  }

  // Befehle verarbeiten
  if (interaction.commandName === 'create') {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'playlist') {
      const playlistName = interaction.options.getString('name');
      const userId = interaction.user.id;
      const userPlaylistsDir = `${playlistsDir}/${userId}`;

      fs.ensureDirSync(userPlaylistsDir);
      const playlistPath = `${userPlaylistsDir}/${playlistName}`;

      if (fs.existsSync(playlistPath)) {
        await interaction.reply(`Playlist "${playlistName}" existiert bereits!`);
        return;
      }

      fs.ensureDirSync(playlistPath);
      fs.writeJsonSync(`${playlistPath}/info.json`, {
        name: playlistName,
        createdAt: new Date().toISOString(),
        songs: []
      });

      await interaction.reply(`Playlist "${playlistName}" erfolgreich erstellt!`);
    }
  } else if (interaction.commandName === 'playlist') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const playlistName = interaction.options.getString('name');
      const url = interaction.options.getString('url');
      const file = interaction.options.getAttachment('file');
      const userId = interaction.user.id;
      const playlistPath = `${playlistsDir}/${userId}/${playlistName}`;

      if (!fs.existsSync(playlistPath)) {
        await interaction.reply(`Playlist "${playlistName}" existiert nicht!`);
        return;
      }

      await interaction.deferReply();

      try {
        // Prüfe, ob eine Datei oder URL angegeben wurde
        if (!url && !file) {
          await interaction.editReply('Du musst entweder eine YouTube-URL oder eine Audiodatei angeben!');
          return;
        }

        // Verarbeite Datei-Upload
        if (file) {
          // Prüfe, ob es sich um eine unterstützte Audiodatei handelt
          const fileExtension = path.extname(file.name).toLowerCase();
          const supportedExtensions = ['.flac', '.mp3', '.wav', '.ogg'];

          if (!supportedExtensions.includes(fileExtension)) {
            await interaction.editReply('Nicht unterstütztes Dateiformat! Unterstützte Formate: FLAC, MP3, WAV, OGG');
            return;
          }

          // Erstelle einen sicheren Dateinamen
          const originalName = path.basename(file.name, fileExtension);
          const sanitizedName = originalName.replace(/[^\w\s]/gi, '_');
          const songPath = path.join(playlistPath, sanitizedName);

          await interaction.editReply(`Lade "${file.name}" herunter...`);

          // Lade die Datei herunter
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Fehler beim Herunterladen der Datei: ${response.statusText}`);
          }

          const buffer = await response.arrayBuffer();
          const uploadedFilePath = `${songPath}${fileExtension}`;

          // Speichere die Datei
          fs.writeFileSync(uploadedFilePath, Buffer.from(buffer));

          await interaction.editReply(`Datei heruntergeladen. Verarbeite...`);

          // Konvertiere in andere Formate, falls nötig
          let mp3Path = null;
          let flacPath = null;
          let rawPath = null;

          // Wenn FLAC hochgeladen wurde, erstelle MP3 und RAW
          if (fileExtension === '.flac') {
            flacPath = uploadedFilePath;

            // Erstelle MP3
            try {
              await interaction.editReply(`Konvertiere zu MP3...`);
              await new Promise((resolve, reject) => {
                ffmpeg(flacPath)
                  .audioBitrate(320)
                  .audioFrequency(48000)
                  .audioChannels(2)
                  .format('mp3')
                  .on('error', (err) => {
                    console.error('FFmpeg MP3-Fehler:', err);
                    resolve(); // Trotz Fehler fortfahren
                  })
                  .on('end', () => {
                    console.log('MP3-Konvertierung abgeschlossen');
                    resolve();
                  })
                  .save(`${songPath}.mp3`);
              });
              mp3Path = `${songPath}.mp3`;
            } catch (error) {
              console.error('Fehler bei MP3-Konvertierung:', error);
            }

            // Erstelle RAW
            try {
              await interaction.editReply(`Konvertiere zu RAW...`);
              await new Promise((resolve, reject) => {
                ffmpeg(flacPath)
                  .format('s16le')
                  .audioFrequency(48000)
                  .audioChannels(2)
                  .on('error', (err) => {
                    console.error('FFmpeg RAW-Fehler:', err);
                    resolve(); // Trotz Fehler fortfahren
                  })
                  .on('end', () => {
                    console.log('RAW-Konvertierung abgeschlossen');
                    resolve();
                  })
                  .save(`${songPath}.raw`);
              });
              rawPath = `${songPath}.raw`;
            } catch (error) {
              console.error('Fehler bei RAW-Konvertierung:', error);
            }
          }
          // Wenn MP3 hochgeladen wurde, versuche FLAC zu erstellen
          else if (fileExtension === '.mp3') {
            mp3Path = uploadedFilePath;

            // Versuche FLAC zu erstellen (optional)
            try {
              await interaction.editReply(`Konvertiere zu FLAC...`);
              await new Promise((resolve, reject) => {
                ffmpeg(mp3Path)
                  .audioBitrate(1411)
                  .audioFrequency(48000)
                  .audioChannels(2)
                  .format('flac')
                  .on('error', (err) => {
                    console.error('FFmpeg FLAC-Fehler:', err);
                    resolve(); // Trotz Fehler fortfahren
                  })
                  .on('end', () => {
                    console.log('FLAC-Konvertierung abgeschlossen');
                    resolve();
                  })
                  .save(`${songPath}.flac`);
              });
              flacPath = `${songPath}.flac`;

              // Wenn FLAC erfolgreich erstellt wurde, versuche auch RAW zu erstellen
              if (fs.existsSync(flacPath)) {
                await interaction.editReply(`Konvertiere zu RAW...`);
                await new Promise((resolve, reject) => {
                  ffmpeg(flacPath)
                    .format('s16le')
                    .audioFrequency(48000)
                    .audioChannels(2)
                    .on('error', (err) => {
                      console.error('FFmpeg RAW-Fehler:', err);
                      resolve(); // Trotz Fehler fortfahren
                    })
                    .on('end', () => {
                      console.log('RAW-Konvertierung abgeschlossen');
                      resolve();
                    })
                    .save(`${songPath}.raw`);
                });
                rawPath = `${songPath}.raw`;
              }
            } catch (error) {
              console.error('Fehler bei FLAC-Konvertierung:', error);
            }
          }
          // Für andere Formate, konvertiere zu MP3, FLAC und RAW
          else {
            // Konvertiere zu MP3
            try {
              await interaction.editReply(`Konvertiere zu MP3...`);
              await new Promise((resolve, reject) => {
                ffmpeg(uploadedFilePath)
                  .audioBitrate(320)
                  .audioFrequency(48000)
                  .audioChannels(2)
                  .format('mp3')
                  .on('error', (err) => {
                    console.error('FFmpeg MP3-Fehler:', err);
                    resolve(); // Trotz Fehler fortfahren
                  })
                  .on('end', () => {
                    console.log('MP3-Konvertierung abgeschlossen');
                    resolve();
                  })
                  .save(`${songPath}.mp3`);
              });
              mp3Path = `${songPath}.mp3`;
            } catch (error) {
              console.error('Fehler bei MP3-Konvertierung:', error);
            }

            // Konvertiere zu FLAC
            try {
              await interaction.editReply(`Konvertiere zu FLAC...`);
              await new Promise((resolve, reject) => {
                ffmpeg(uploadedFilePath)
                  .audioBitrate(1411)
                  .audioFrequency(48000)
                  .audioChannels(2)
                  .format('flac')
                  .on('error', (err) => {
                    console.error('FFmpeg FLAC-Fehler:', err);
                    resolve(); // Trotz Fehler fortfahren
                  })
                  .on('end', () => {
                    console.log('FLAC-Konvertierung abgeschlossen');
                    resolve();
                  })
                  .save(`${songPath}.flac`);
              });
              flacPath = `${songPath}.flac`;

              // Wenn FLAC erfolgreich erstellt wurde, versuche auch RAW zu erstellen
              if (fs.existsSync(flacPath)) {
                await interaction.editReply(`Konvertiere zu RAW...`);
                await new Promise((resolve, reject) => {
                  ffmpeg(flacPath)
                    .format('s16le')
                    .audioFrequency(48000)
                    .audioChannels(2)
                    .on('error', (err) => {
                      console.error('FFmpeg RAW-Fehler:', err);
                      resolve(); // Trotz Fehler fortfahren
                    })
                    .on('end', () => {
                      console.log('RAW-Konvertierung abgeschlossen');
                      resolve();
                    })
                    .save(`${songPath}.raw`);
                });
                rawPath = `${songPath}.raw`;
              }
            } catch (error) {
              console.error('Fehler bei FLAC-Konvertierung:', error);
            }
          }

          // Füge den Song zur Playlist hinzu
          const song = {
            title: sanitizedName,
            url: '', // Keine URL für hochgeladene Dateien
            mp3Path: mp3Path ? mp3Path.replace(/\\/g, '/') : null,
            flacPath: flacPath ? flacPath.replace(/\\/g, '/') : null,
            rawPath: rawPath ? rawPath.replace(/\\/g, '/') : null,
            addedAt: new Date().toISOString(),
            uploadedFile: true
          };

          const infoPath = `${playlistPath}/info.json`;
          const info = fs.readJsonSync(infoPath);
          info.songs.push(song);
          fs.writeJsonSync(infoPath, info);

          await interaction.editReply(`"${sanitizedName}" zur Playlist "${playlistName}" hinzugefügt und in verschiedene Formate konvertiert!`);
        }
        // Verarbeite YouTube-URL (bestehender Code)
        else {
          // Verwende play-dl statt ytdl-core
          const songInfo = await play.video_info(url);
          const songTitle = songInfo.video_details.title;
          const sanitizedTitle = songTitle.replace(/[^\w\s]/gi, '_'); // Entferne unerwünschte Zeichen

          await interaction.editReply(`Lade "${songTitle}" in höchster Qualität herunter... Dies kann einen Moment dauern.`);

          const songPath = path.join(playlistPath, sanitizedTitle);
          // Übergebe die interaction für Fortschrittsupdates
          const downloadedPaths = await downloadSong(url, songPath, interaction);

          const song = {
            title: songTitle,
            url: url,
            mp3Path: downloadedPaths.mp3Path ? downloadedPaths.mp3Path.replace(/\\/g, '/') : null,
            flacPath: downloadedPaths.flacPath ? downloadedPaths.flacPath.replace(/\\/g, '/') : null,
            rawPath: downloadedPaths.rawPath ? downloadedPaths.rawPath.replace(/\\/g, '/') : null,
            addedAt: new Date().toISOString()
          };

          const infoPath = `${playlistPath}/info.json`;
          const info = fs.readJsonSync(infoPath);
          info.songs.push(song);
          fs.writeJsonSync(infoPath, info);

          await interaction.editReply(`"${songTitle}" zur Playlist "${playlistName}" in höchster Audioqualität hinzugefügt und heruntergeladen!`);
        }
      } catch (error) {
        console.error(error);
        await interaction.editReply('Fehler beim Hinzufügen des Songs. Stelle sicher, dass die URL oder Datei gültig ist.');
      }
    } else if (subcommand === 'play') {
      const playlistName = interaction.options.getString('name');
      const userId = interaction.user.id;
      const playlistPath = `${playlistsDir}/${userId}/${playlistName}`;

      if (!fs.existsSync(playlistPath)) {
        await interaction.reply(`Playlist "${playlistName}" existiert nicht!`);
        return;
      }

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        await interaction.reply('Du musst in einem Sprachkanal sein, um Musik abzuspielen!');
        return;
      }

      await interaction.deferReply();

      try {
        const info = fs.readJsonSync(`${playlistPath}/info.json`);

        if (info.songs.length === 0) {
          await interaction.editReply(`Playlist "${playlistName}" ist leer. Füge Songs mit dem /playlist add Befehl hinzu.`);
          return;
        }

        // Verbindung zum Voice-Channel herstellen
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        // Speichere den Player mit Kanal-ID, um mehrere Instanzen zu unterstützen
        const channelId = voiceChannel.id;
        players.set(channelId, {
          player,
          connection,
          songs: [...info.songs],
          currentIndex: 0,
          textChannel: interaction.channel,
          userId: userId // Speichere die User-ID für Berechtigungsprüfungen
        });

        const playSong = async (channelId, index) => {
          const guildPlayer = players.get(channelId);
          if (!guildPlayer || index >= guildPlayer.songs.length) return;

          const song = guildPlayer.songs[index];

          // Normalisiere die Pfade (ersetze Backslashes durch Slashes)
          if (song.rawPath) song.rawPath = song.rawPath.replace(/\\/g, '/');
          if (song.flacPath) song.flacPath = song.flacPath.replace(/\\/g, '/');
          if (song.mp3Path) song.mp3Path = song.mp3Path.replace(/\\/g, '/');

          // Verwende FLAC als erste Wahl, dann RAW, dann MP3
          // Ändere die Priorität: FLAC > RAW > MP3
          let audioPath = song.flacPath;

          console.log(`Versuche Song abzuspielen: ${song.title}`);
          console.log(`FLAC-Pfad: ${song.flacPath}`);
          console.log(`RAW-Pfad: ${song.rawPath}`);
          console.log(`MP3-Pfad: ${song.mp3Path}`);

          // Prüfe, ob die Dateien existieren
          if (!audioPath || !fs.existsSync(audioPath)) {
            console.log(`FLAC-Datei existiert nicht oder Pfad ist ungültig: ${audioPath}`);
            audioPath = song.mp3Path; // Versuche MP3 vor RAW, da RAW Probleme verursachen könnte

            if (!audioPath || !fs.existsSync(audioPath)) {
              console.log(`MP3-Datei existiert nicht oder Pfad ist ungültig: ${audioPath}`);
              audioPath = song.rawPath; // RAW als letzte Option

              if (!audioPath || !fs.existsSync(audioPath)) {
                console.log(`RAW-Datei existiert nicht oder Pfad ist ungültig: ${audioPath}`);
                guildPlayer.textChannel.send(`Fehler: Keine gültige Audiodatei für "${song.title}" gefunden!`);

                // Gehe zum nächsten Song
                guildPlayer.currentIndex++;
                if (guildPlayer.currentIndex < guildPlayer.songs.length) {
                  playSong(channelId, guildPlayer.currentIndex);
                } else {
                  guildPlayer.textChannel.send('Playlist beendet!');
                  guildPlayer.connection.destroy();
                  players.delete(channelId);
                }
                return;
              }
            }
          }

          console.log(`Spiele Datei ab: ${audioPath}`);

          try {
            const resource = createAudioResource(audioPath, {
              inputType: audioPath.endsWith('.raw') ? 1 : undefined, // 1 = PCM
              inlineVolume: true
            });

            // Erhöhe die Lautstärke für mehr Bass
            resource.volume.setVolume(1.5); // Etwas über Standardlautstärke für mehr Bass

            guildPlayer.player.play(resource);
            guildPlayer.textChannel.send(`🎵 Spiele jetzt in höchster Qualität: **${song.title}**`);
          } catch (error) {
            console.error(`Fehler beim Abspielen von "${song.title}":`, error);
            guildPlayer.textChannel.send(`Fehler beim Abspielen von "${song.title}": ${error.message}`);

            // Versuche eine andere Datei, wenn verfügbar
            if (audioPath === song.rawPath && song.flacPath && fs.existsSync(song.flacPath)) {
              console.log(`Versuche FLAC als Fallback für "${song.title}"`);
              audioPath = song.flacPath;
              try {
                const resource = createAudioResource(audioPath, {
                  inlineVolume: true
                });
                resource.volume.setVolume(1.5);
                guildPlayer.player.play(resource);
                guildPlayer.textChannel.send(`🎵 Spiele jetzt in FLAC-Qualität: **${song.title}**`);
                return;
              } catch (flacError) {
                console.error(`Auch FLAC-Fallback fehlgeschlagen:`, flacError);
              }
            } else if ((audioPath === song.rawPath || audioPath === song.flacPath) && song.mp3Path && fs.existsSync(song.mp3Path)) {
              console.log(`Versuche MP3 als Fallback für "${song.title}"`);
              audioPath = song.mp3Path;
              try {
                const resource = createAudioResource(audioPath, {
                  inlineVolume: true
                });
                resource.volume.setVolume(1.5);
                guildPlayer.player.play(resource);
                guildPlayer.textChannel.send(`🎵 Spiele jetzt in MP3-Qualität: **${song.title}**`);
                return;
              } catch (mp3Error) {
                console.error(`Auch MP3-Fallback fehlgeschlagen:`, mp3Error);
              }
            }

            // Wenn alle Fallbacks fehlschlagen, gehe zum nächsten Song
            guildPlayer.currentIndex++;
            if (guildPlayer.currentIndex < guildPlayer.songs.length) {
              playSong(channelId, guildPlayer.currentIndex);
            } else {
              guildPlayer.textChannel.send('Playlist beendet!');
              guildPlayer.connection.destroy();
              players.delete(channelId);
            }
          }
        };

        player.on(AudioPlayerStatus.Idle, () => {
          const guildPlayer = players.get(channelId);
          if (guildPlayer) {
            guildPlayer.currentIndex++;
            if (guildPlayer.currentIndex < guildPlayer.songs.length) {
              playSong(channelId, guildPlayer.currentIndex);
            } else {
              guildPlayer.textChannel.send('Playlist beendet!');
              guildPlayer.connection.destroy();
              players.delete(channelId);
            }
          }
        });

        await playSong(channelId, 0);
        await interaction.editReply(`Spiele Playlist "${playlistName}" in höchster Audioqualität ab!`);
      } catch (error) {
        console.error(error);
        await interaction.editReply('Ein Fehler ist beim Abspielen der Playlist aufgetreten.');
      }
    } else if (subcommand === 'skip') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        await interaction.reply('Du musst in einem Sprachkanal sein, um Songs zu überspringen!');
        return;
      }

      const channelId = voiceChannel.id;
      const guildPlayer = players.get(channelId);

      if (!guildPlayer) {
        await interaction.reply('Es wird derzeit keine Musik in deinem Kanal abgespielt!');
        return;
      }

      // Prüfe, ob der Benutzer berechtigt ist (entweder der Ersteller oder ein Admin)
      if (guildPlayer.userId !== interaction.user.id && !interaction.member.permissions.has('ADMINISTRATOR')) {
        await interaction.reply('Du kannst nur deine eigene Playlist überspringen!');
        return;
      }

      const skipAmount = interaction.options.getInteger('amount') || 1;

      if (skipAmount <= 0) {
        await interaction.reply('Die Anzahl der zu überspringenden Songs muss positiv sein!');
        return;
      }

      const oldIndex = guildPlayer.currentIndex;
      guildPlayer.currentIndex += skipAmount;

      if (guildPlayer.currentIndex >= guildPlayer.songs.length) {
        await interaction.reply('Playlist beendet! Es gibt keine weiteren Songs zum Überspringen.');
        guildPlayer.player.stop();
        guildPlayer.connection.destroy();
        players.delete(channelId);
        return;
      }

      // Spiele den nächsten Song ab
      guildPlayer.player.stop(); // Stoppt den aktuellen Song, was das Idle-Event auslöst

      await interaction.reply(`${skipAmount} Song(s) übersprungen! Spiele jetzt: **${guildPlayer.songs[guildPlayer.currentIndex].title}**`);
    } else if (subcommand === 'list') {
      const playlistName = interaction.options.getString('name');
      const userId = interaction.user.id;
      const playlistPath = `${playlistsDir}/${userId}/${playlistName}`;

      if (!fs.existsSync(playlistPath)) {
        await interaction.reply(`Playlist "${playlistName}" existiert nicht!`);
        return;
      }

      try {
        const info = fs.readJsonSync(`${playlistPath}/info.json`);

        if (info.songs.length === 0) {
          await interaction.reply(`Playlist "${playlistName}" ist leer. Füge Songs mit dem /playlist add Befehl hinzu.`);
          return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Playlist: ${playlistName}`)
            .setDescription(`${info.songs.length} Songs`)
            .setColor('#0099ff');

        info.songs.forEach((song, index) => {
          embed.addFields({ name: `${index + 1}. ${song.title}`, value: song.url });
        });

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.reply('Ein Fehler ist beim Anzeigen der Playlist aufgetreten.');
      }
    }
  } else if (interaction.commandName === 'stop') {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply('Du musst in einem Sprachkanal sein, um die Wiedergabe zu stoppen!');
      return;
    }

    const channelId = voiceChannel.id;
    const guildPlayer = players.get(channelId);

    if (!guildPlayer) {
      await interaction.reply('Es wird derzeit keine Musik in deinem Kanal abgespielt!');
      return;
    }

    // Prüfe, ob der Benutzer berechtigt ist (entweder der Ersteller oder ein Admin)
    if (guildPlayer.userId !== interaction.user.id && !interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply('Du kannst nur deine eigene Playlist stoppen!');
      return;
    }

    // Beende den Stream, falls es sich um eine Stream-Playlist handelt
    if (guildPlayer.isStreamPlaylist && guildPlayer.currentStream) {
      try {
        guildPlayer.currentStream.stream.destroy();
      } catch (error) {
        console.error('Fehler beim Beenden des Streams:', error);
      }
    }

    guildPlayer.player.stop();
    guildPlayer.connection.destroy();
    players.delete(channelId);

    await interaction.reply('Wiedergabe gestoppt!');
  }
});

client.login(process.env.DISCORD_TOKEN);
