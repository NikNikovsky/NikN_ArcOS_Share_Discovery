# ArcOS Share Discovery

Browse SMB file shares on your local network, and mount them as drives inside ArcOS.

## What it does

- **Manual mode** (no setup): type a host and share, copy the UNC path, or save a list of hosts for later. Works the moment the app opens.
- **Discovery mode**: run the one-file PowerShell helper once, then scan the LAN (mDNS, WS-Discovery, NetBIOS, TCP/445 sweep) to find hosts and enumerate their shares.
- **Mount as a drive**: open any disk share as a read-only drive in the File Manager and the media player. Credentials are kept in memory only — never written to disk.
- **Sign in per host**: guest access is off by default on Windows, so the app remembers a sign-in for the life of the window and lets you forget it with one click.

## Requirements

- A Windows PC to run the helper (PowerShell 5.1 ships with Windows; nothing to install).
- For discovery/mounting: the helper running on `127.0.0.1:8790` (loopback only, no admin rights, no firewall prompt).

## Privacy

No credentials or host lists are sent anywhere. The helper listens on loopback only and talks to the ArcOS page over HTTPS-with-PNA. Passwords are held in memory for the window's lifetime and are never written to preferences.

## Author

Nik Nikovsky
