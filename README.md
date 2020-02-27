Spotify Adblock Windows
=========

Spotify adblock windows is a spotify adblocker inspired by [spotify-adblock-linux](https://github.com/abba23/spotify-adblock-linux) which uses a MITM proxy to block all blacklisted URLs as well as all domains that aren't whitelisted.

## Getting started

### Prerequisites
 - NodeJS and NPM (or yarn)

### Installing
 1. Clone the repository with `git clone https://github.com/fuwwy/spotify-adblock-windows.git` or download the latest version from the [releases page](https://github.com/fuwwy/spotify-adblock-windows/releases)
 2. Run `npm install` to download all the required dependencies
 3. Open Spotify `Settings` page, scroll all the way down and click `Show Advanced Settings`, set the proxy type to HTTP, the host to `127.0.0.1` and the port to `8081`, finally, click `Update Proxy`
 4. Execute `start.bat` (or run `npm start`) to initiate the application
 5. Install the CA certificate under `certs/certs/ca.crt` on "Trusted Root Certification Authorities" (more information [here](https://github.com/fuwwy/spotify-adblock-windows/wiki/Installing-the-root-CA))
 6. Enjoy listening without distractions.
