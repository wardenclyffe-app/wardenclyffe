package main

import (
	log "github.com/sirupsen/logrus"

	"github.com/shippin/wardenclyffe/combined/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		log.Fatalf("failed to execute command: %v", err)
	}
}
