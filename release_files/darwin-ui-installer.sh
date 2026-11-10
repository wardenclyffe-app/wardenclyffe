#!/bin/sh

export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin

# check if wardenclyffe is installed
NB_BIN=$(which wardenclyffe)
if [ -n "$NB_BIN" ]
then
  echo "Stopping and uninstalling Wardenclyffe daemon"
  wardenclyffe service stop || true
  wardenclyffe service uninstall || true
fi

# check if wardenclyffe is installed
NB_BIN=$(which wardenclyffe)
if [ -z "$NB_BIN" ]
then
  echo "Wardenclyffe daemon is not installed. Please run: brew install shippin/wardenclyffe/tap/wardenclyffe"
  exit 1
fi
NB_UI_VERSION=$1
NB_VERSION=$(wardenclyffe version)
if [ "X-$NB_UI_VERSION" != "X-$NB_VERSION" ]
then
  echo "Wardenclyffe's daemon is running with a different version than the Wardenclyffe's UI:"
  echo "Wardenclyffe UI Version: $NB_UI_VERSION"
  echo "Wardenclyffe Daemon Version: $NB_VERSION"
  echo "Please run: brew install shippin/wardenclyffe/tap/wardenclyffe"
  echo "to update it"
fi

if [ -n "$NB_BIN" ]
then
  echo "Stopping WardenClyffe daemon"
  osascript -e 'quit app "Wardenclyffe UI"' 2> /dev/null || true
  wardenclyffe service stop 2> /dev/null || true
fi

# start wardenclyffe daemon service
echo "Starting Wardenclyffe daemon"
wardenclyffe service install 2> /dev/null || true
wardenclyffe service start || true

# start app
open /Applications/Wardenclyffe\ UI.app
