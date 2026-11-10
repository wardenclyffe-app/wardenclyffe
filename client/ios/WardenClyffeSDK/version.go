//go:build ios

package WardenClyffeSDK

import "github.com/shippin/wardenclyffe/version"

// GoClientVersion returns the WardenClyffe Go client version that was baked into
// the framework at compile time via
// -ldflags "-X github.com/shippin/wardenclyffe/version.version=<version>".
func GoClientVersion() string {
	return version.WardenclyffeVersion()
}
