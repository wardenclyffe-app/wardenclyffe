package desktop

import "github.com/shippin/wardenclyffe/version"

// GetUIUserAgent returns the Desktop ui user agent
func GetUIUserAgent() string {
	return "wardenclyffe-desktop-ui/" + version.WardenclyffeVersion()
}
