#!/bin/sh

export PATH=$PATH:/usr/local/bin

# check if wardenclyffe is installed
NB_BIN=$(which wardenclyffe)
if [ -z "$NB_BIN" ]
then
  exit 0
fi
# start wardenclyffe daemon service
echo "wardenclyffe daemon service still running. You can uninstall it by running: "
echo "sudo wardenclyffe service stop"
echo "sudo wardenclyffe service uninstall"
