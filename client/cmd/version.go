package cmd

import (
	"github.com/spf13/cobra"

	"github.com/shippin/wardenclyffe/version"
)

var (
	versionCmd = &cobra.Command{
		Use:   "version",
		Short: "Print the WardenClyffe's client application version",
		Run: func(cmd *cobra.Command, args []string) {
			cmd.SetOut(cmd.OutOrStdout())
			out := version.WardenclyffeVersion()
			if version.IsDevelopmentVersion(out) {
				if commit := version.WardenclyffeCommit(); commit != "" {
					out += "-" + commit
				}
			}
			cmd.Println(out)
		},
	}
)
