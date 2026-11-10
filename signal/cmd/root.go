package cmd

import (
	"fmt"
	"os"
	"os/signal"
	"runtime"

	"github.com/spf13/cobra"

	"github.com/shippin/wardenclyffe/version"
)

const (
	// ExitSetupFailed defines exit code
	ExitSetupFailed = 1
)

var (
	logLevel       string
	defaultLogFile string
	logFile        string

	rootCmd = &cobra.Command{
		Use:     "wardenclyffe-signal",
		Short:   "",
		Long:    "",
		Version: version.WardenclyffeVersion(),
	}

	// Execution control channel for stopCh signal
	stopCh chan int
)

// Execute executes the root command.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	stopCh = make(chan int)
	defaultLogFile = "/var/log/wardenclyffe/signal.log"

	if runtime.GOOS == "windows" {
		defaultLogFile = os.Getenv("PROGRAMDATA") + "\\Wardenclyffe\\" + "signal.log"
	}

	rootCmd.PersistentFlags().StringVar(&logLevel, "log-level", "info", "")
	rootCmd.PersistentFlags().StringVar(&logFile, "log-file", defaultLogFile, "sets Wardenclyffe log path. If console is specified the log will be output to stdout")
	rootCmd.AddCommand(runCmd)
}

// SetupCloseHandler handles SIGTERM signal and exits with success
func SetupCloseHandler() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	go func() {
		for range c {
			fmt.Println("\r- Ctrl+C pressed in Terminal")
			stopCh <- 0
		}
	}()
}
