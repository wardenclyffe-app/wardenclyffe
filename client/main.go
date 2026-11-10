package main

import (
	"os"

	"github.com/shippin/wardenclyffe/client/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
