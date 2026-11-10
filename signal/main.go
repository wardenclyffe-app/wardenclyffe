package main

import (
	"github.com/shippin/wardenclyffe/signal/cmd"
	"os"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
