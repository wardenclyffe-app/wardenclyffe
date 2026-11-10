//go:build ios

package WardenClyffeSDK

import (
	"github.com/shippin/wardenclyffe/util"
)

// InitializeLog initializes the log file.
func InitializeLog(logLevel string, filePath string) error {
	return util.InitLog(logLevel, filePath)
}
